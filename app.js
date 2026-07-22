/**
 * Plesk Node.js / Phusion Passenger entry for SIKILAT (Next.js).
 *
 * Plesk settings:
 *   Application Root        = /httpdocs  (folder with package.json)
 *   Application Startup File = app.js
 *   Application Mode        = production
 *
 * Requires successful `npm run build` first (.next must exist).
 * Delete or rename any default Plesk index.html in Document Root —
 * otherwise Apache/nginx may serve the welcome page instead of Node.
 */
process.env.NODE_ENV = process.env.NODE_ENV || "production";

const { createServer } = require("node:http");
const { parse } = require("node:url");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "127.0.0.1";
// Plesk / Passenger injects PORT — do not hardcode 3000 in production.
const port = Number(process.env.PORT) || 3000;

const app = next({ dev, hostname, port, dir: __dirname });
const handle = app.getRequestHandler();

const isPassenger = typeof PhusionPassenger !== "undefined";

if (isPassenger) {
  // Passenger manages the process; optional configure if available.
  try {
    // eslint-disable-next-line no-undef
    PhusionPassenger.configure({ autoInstall: false });
  } catch {
    /* ignore */
  }
}

app
  .prepare()
  .then(() => {
    const server = createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error("SIKILAT request error", req.url, err);
        res.statusCode = 500;
        res.end("Internal Server Error");
      }
    });

    // Passenger: listen on 'passenger' socket; otherwise bind PORT.
    const listenTarget = isPassenger ? "passenger" : port;
    const listenHost = isPassenger ? undefined : hostname;

    server.listen(listenTarget, listenHost, () => {
      console.log(
        `SIKILAT ready (${dev ? "dev" : "production"})` +
          (isPassenger ? " via Passenger" : ` on ${hostname}:${port}`),
      );
    });
  })
  .catch((err) => {
    console.error("Failed to start SIKILAT:", err);
    process.exit(1);
  });
