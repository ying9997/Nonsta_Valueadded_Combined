/** 本机打开质量看板。只提供 dashboard 目录里的页面，不对外。 */
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

createServer((req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  const rel = decodeURIComponent(url.pathname);
  let path = normalize(join(root, rel));
  if (!path.startsWith(normalize(root))) {
    res.writeHead(403);
    res.end("forbidden");
    return;
  }
  if (rel === "/") path = join(root, "index.html");
  try {
    const body = readFileSync(path);
    res.writeHead(200, { "Content-Type": types[extname(path)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
}).listen(8765, "127.0.0.1", () => {
  console.log("http://127.0.0.1:8765/");
});
