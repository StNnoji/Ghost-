const { spawn } = require("child_process");
const path = require("path");

const cwd = path.resolve(__dirname, "..");
const node = process.execPath;
const viteBin = path.join(cwd, "node_modules", "vite", "bin", "vite.js");

function start(name, command, args) {
  const child = spawn(command, args, {
    cwd,
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });

  child.stdout.on("data", (data) => process.stdout.write(`[${name}] ${data}`));
  child.stderr.on("data", (data) => process.stderr.write(`[${name}] ${data}`));
  child.on("exit", (code) => {
    if (code !== 0) process.exitCode = code;
  });

  return child;
}

const server = start("api", node, ["server/index.js"]);
const client = start("web", node, [viteBin, "--host", "127.0.0.1", "--port", "5174"]);

function shutdown() {
  server.kill();
  client.kill();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
