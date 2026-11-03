const http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path"),
  { spawn } = require("node:child_process");
const root = path.resolve(__dirname, "../mockup");
const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === "/legacy-init") {
      res
        .writeHead(200, { "Content-Type": "text/html" })
        .end("<!doctype html><title>Legacy fixture</title>");
      return;
    }
    if (!url.pathname.startsWith("/CaloriType/")) {
      res.writeHead(404).end();
      return;
    }
    const relative =
        decodeURIComponent(url.pathname.slice("/CaloriType/".length)) ||
        "index.html",
      file = path.resolve(root, relative);
    if (!file.startsWith(root + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    const type =
      {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
        ".json": "application/json",
      }[path.extname(file)] || "application/octet-stream";
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, {
      "Content-Type": type + "; charset=utf-8",
      "Cache-Control": "no-store",
    });
    fs.createReadStream(file).pipe(res);
  } catch {
    res.writeHead(400).end();
  }
});
server.listen(0, "127.0.0.1", () => {
  const script = process.argv.includes("--performance")
      ? "performance.cjs"
      : "features.cjs",
    env = {
      ...process.env,
      CALORITYPE_TEST_URL: `http://127.0.0.1:${server.address().port}/CaloriType/`,
    };
  const child = spawn(process.execPath, [path.join(__dirname, script)], {
    env,
    stdio: "inherit",
  });
  child.on("error", (e) => {
    console.error(e);
    server.close();
    process.exitCode = 1;
  });
  child.on("exit", (code) => {
    server.close();
    process.exitCode = typeof code === "number" ? code : 1;
  });
});
