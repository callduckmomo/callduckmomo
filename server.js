const { createServer } = require("node:http");
const next = require("next");

// Plesk provides the port at runtime. Bind on all interfaces so the reverse
// proxy can reach the Next.js server from the hosting container.
const port = Number.parseInt(process.env.PORT || "3000", 10);
const hostname = "0.0.0.0";
const app = next({ dev: false, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    createServer((request, response) => handle(request, response)).listen(
      port,
      hostname,
      () => console.log(`Next.js ready on port ${port}`),
    );
  })
  .catch((error) => {
    console.error("Unable to start Next.js", error);
    process.exit(1);
  });
