import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(".ui-dist");
const types = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".png": "image/png", ".ttf": "font/ttf", ".ico": "image/x-icon" };
http.createServer(async (req, res) => {
  const requested = path.resolve(root, `.${new URL(req.url, "http://localhost").pathname}`);
  if (!requested.startsWith(`${root}${path.sep}`) && requested !== root) {
    res.writeHead(403).end();
    return;
  }
  try {
    const file = await readFile(requested);
    res.setHeader("Content-Type", types[path.extname(requested)] ?? "application/octet-stream");
    res.end(file);
  } catch {
    res.setHeader("Content-Type", "text/html");
    res.end(await readFile(path.join(root, "index.html")));
  }
}).listen(8091, "127.0.0.1");
