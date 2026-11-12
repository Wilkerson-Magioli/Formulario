import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import participacao from "./api/participacao.mjs";
import admin from "./api/admin.mjs";
const root = path.resolve("public");
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
};
http
  .createServer(async (req, res) => {
    try {
      const name = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      if (name === "/api/participacao") {
        await participacao(req, res);
        return;
      }
      if (name === "/api/admin") {
        await admin(req, res);
        return;
      }
      const file = path.resolve(
        root,
        "." +
          (name === "/"
            ? "/index.html"
            : name === "/admin"
              ? "/admin.html"
              : name),
      );
      if (!file.startsWith(root + path.sep)) {
        res.writeHead(403).end();
        return;
      }
      const body = await readFile(file);
      res.writeHead(200, {
        "Content-Type": types[path.extname(file)] || "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(body);
    } catch {
      res.writeHead(404).end("Página não encontrada");
    }
  })
  .listen(5173, "127.0.0.1", () => console.log("Local: http://127.0.0.1:5173"));
