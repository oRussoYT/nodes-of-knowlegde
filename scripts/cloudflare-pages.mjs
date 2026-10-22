// Turns the OpenNext build (.open-next/) into a Cloudflare Pages site.
//
// Cloudflare Pages serves the folder .open-next/assets. Pages runs the
// server part of the site (sign-in, member area, forms) from a folder named
// _worker.js inside it, so this script copies the OpenNext server files there.
// _routes.json tells Pages to serve photos and build files directly, without
// running the server, so they do not count toward the free daily limit.
//
// Run after `npx opennextjs-cloudflare build` (see "build:pages" in
// package.json). Pages build settings: command `npm run build:pages`,
// output folder `.open-next/assets`.
import { cpSync, existsSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = ".open-next";
const assets = join(root, "assets");
const worker = join(assets, "_worker.js");

if (!existsSync(join(root, "worker.js"))) {
  console.error("Missing .open-next/worker.js -- run `npx opennextjs-cloudflare build` first.");
  process.exit(1);
}

rmSync(worker, { recursive: true, force: true });
for (const entry of readdirSync(root)) {
  if (entry === "assets") continue;
  cpSync(join(root, entry), join(worker, entry), { recursive: true });
}
renameSync(join(worker, "worker.js"), join(worker, "index.js"));

writeFileSync(
  join(assets, "_routes.json"),
  JSON.stringify(
    {
      version: 1,
      include: ["/*"],
      exclude: ["/_next/static/*", "/photos/*", "/favicon.ico"],
    },
    null,
    2,
  ),
);

console.log("Cloudflare Pages output ready in .open-next/assets (server in _worker.js/).");
