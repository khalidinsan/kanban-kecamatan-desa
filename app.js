/**
 * Plesk / Passenger startup for SIKILAT (Next.js).
 * Set Application Startup File = app.js
 *
 * Requires a successful `npm run build` first (.next must exist).
 */
const { createServer } = require("node:http");
const { parse } = require("node:url");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = Number(process.env.PORT) || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error("Request error", req.url, err);
        res.statusCode = 500;
        res.end("Internal Server Error");
      }
    }).listen(port, hostname, () => {
      console.log(`SIKILAT ready on http://${hostname}:${port} (${dev ? "dev" : "production"})`);
    });
  })
  .catch((err) => {
    console.error("Failed to start SIKILAT:", err);
    process.exit(1);
  });
