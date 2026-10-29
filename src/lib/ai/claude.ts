// A thin call to Claude over fetch (no extra dependency), either directly
// (Anthropic key, sk-ant-...) or through OpenRouter (key sk-or-...). The key
// lives only on the server (Cloudflare secret ANTHROPIC_API_KEY or
// OPENROUTER_API_KEY); nothing here runs in the browser. Every answer is used
// as a SUGGESTION that a person confirms.

export const CLAUDE_MODEL = "claude-sonnet-5-5";
export const OPENROUTER_DEFAULT_MODEL = "anthropic/claude-sonnet-4.5";

type Provider = { kind: "anthropic" | "openrouter"; key: string; model: string };

function env(name: string): string | null {
  const v = typeof process !== "undefined" ? process.env[name] : undefined;
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

export function aiProvider(): Provider | null {
  const key = env("OPENROUTER_API_KEY") ?? env("ANTHROPIC_API_KEY");
  if (!key) return null;
  if (key.startsWith("sk-or-")) return { kind: "openrouter", key, model: env("AI_MODEL") ?? OPENROUTER_DEFAULT_MODEL };
  return { kind: "anthropic", key, model: env("AI_MODEL") ?? CLAUDE_MODEL };
}

export function claudeIsOn(): boolean {
  return aiProvider() !== null;
}

type Block =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
  | { type: "document"; source: { type: "base64"; media_type: string; data: string } };

/** Anthropic-style content blocks in OpenRouter's (OpenAI-style) shape. */
export function toOpenRouterContent(content: unknown[]): unknown[] {
  return (content as Block[]).map((b) => {
    if (b.type === "image") return { type: "image_url", image_url: { url: `data:${b.source.media_type};base64,${b.source.data}` } };
    if (b.type === "document") return { type: "file", file: { filename: "document.pdf", file_data: `data:${b.source.media_type};base64,${b.source.data}` } };
    return { type: "text", text: (b as { text: string }).text };
  });
}

export function openRouterText(json: unknown): string | null {
  const c = (json as { choices?: { message?: { content?: unknown } }[] })?.choices?.[0]?.message?.content;
  if (typeof c === "string") return c || null;
  if (Array.isArray(c)) return c.map((p) => (typeof p?.text === "string" ? p.text : "")).join("") || null;
  return null;
}

export async function askClaude(content: unknown[], maxTokens = 2000, timeoutMs = 60_000): Promise<string | null> {
  const provider = aiProvider();
  if (!provider) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    if (provider.kind === "openrouter") {
      const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${provider.key}`,
          "HTTP-Referer": "https://nodes-bdffp.pages.dev",
          "X-Title": "Nodes of Knowledge",
        },
        body: JSON.stringify({ model: provider.model, max_tokens: maxTokens, messages: [{ role: "user", content: toOpenRouterContent(content) }] }),
        signal: controller.signal,
      });
      return r.ok ? openRouterText(await r.json()) : null;
    }
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": provider.key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: provider.model, max_tokens: maxTokens, messages: [{ role: "user", content }] }),
      signal: controller.signal,
    });
    if (!r.ok) return null;
    const json = (await r.json()) as { content?: { type: string; text?: string }[] };
    return json.content?.filter((c) => c.type === "text").map((c) => c.text ?? "").join("") || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** The first JSON object in a model answer, or null. */
export function firstJsonObject(answer: string): unknown {
  const start = answer.indexOf("{");
  const end = answer.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(answer.slice(start, end + 1));
  } catch {
    return null;
  }
}
