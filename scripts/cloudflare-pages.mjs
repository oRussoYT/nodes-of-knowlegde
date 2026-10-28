// Turns the OpenNext build (.open-next/) into a Cloudflare Pages site.
//
// Cloudflare Pages serves the folder .open-next/assets. Pages runs the
// server part of the site (sign-in, member area, forms) from a folder named
// _worker.js inside it, so this script bundles the OpenNext server there.
// _routes.json tells Pages to serve photos and build files directly, without
// running the server, so they do not count toward the free daily limit.
//
// Run after `npx opennextjs-cloudflare build` (see "build:pages" in
// package.json). Pages build settings: command `npm run build:pages`,
// output folder `.open-next/assets`.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = ".open-next";
const assets = join(root, "assets");
const worker = join(assets, "_worker.js");

if (!existsSync(join(root, "worker.js"))) {
  console.error("Missing .open-next/worker.js -- run `npx opennextjs-cloudflare build` first.");
  process.exit(1);
}

rmSync(worker, { recursive: true, force: true });

// Bundle the OpenNext server into ready-to-run files exactly as a Workers
// deploy would (wrangler, without uploading anything). Pages cannot run the
// raw OpenNext files directly ("require is not defined").
const bundled = join(root, ".pages-bundle");
rmSync(bundled, { recursive: true, force: true });
execFileSync("npx", ["wrangler", "deploy", "--dry-run", "--outdir", bundled], { stdio: "inherit" });
cpSync(bundled, worker, { recursive: true });
const entry = existsSync(join(worker, "worker.js")) ? "worker.js" : "index.js";
if (entry === "index.js") renameSync(join(worker, "index.js"), join(worker, "server.js"));
const serverFile = entry === "index.js" ? "server.js" : "worker.js";

// Pages starts the server from _worker.js/index.js. A small entry loads the
// OpenNext server; on preview addresses (not the main site) it shows the error
// text instead of Cloudflare's blank error page, to make problems findable.
writeFileSync(
  join(worker, "index.js"),
  `const MAIN_HOST = "nodes-bdffp.pages.dev";
export default {
  async fetch(request, env, ctx) {
    try {
      const { default: server } = await import("./${serverFile}");
      return await server.fetch(request, env, ctx);
    } catch (error) {
      if (new URL(request.url).hostname === MAIN_HOST) throw error;
      return new Response(String((error && error.stack) || error), { status: 500 });
    }
  },
};
`,
);

writeFileSync(
  join(assets, "_routes.json"),
  JSON.stringify(
    {
      version: 1,
      include: ["/*"],
      exclude: ["/_next/static/*", "/photos/*", "/maps/*", "/favicon.ico"],
    },
    null,
    2,
  ),
);

console.log("Cloudflare Pages output ready in .open-next/assets (server in _worker.js/).");
