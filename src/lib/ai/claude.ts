// A thin call to the Anthropic Messages API over fetch (no extra
// dependency). The key lives only on the server (Cloudflare secret
// ANTHROPIC_API_KEY); nothing here runs in the browser. Every answer is used
// as a SUGGESTION that a person confirms.

export const CLAUDE_MODEL = "claude-sonnet-5-5";

export function claudeIsOn(): boolean {
  return typeof process.env.ANTHROPIC_API_KEY === "string" && process.env.ANTHROPIC_API_KEY.trim() !== "";
}

export async function askClaude(content: unknown[], maxTokens = 2000, timeoutMs = 60_000): Promise<string | null> {
  if (!claudeIsOn()) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY!.trim(), "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: maxTokens, messages: [{ role: "user", content }] }),
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
