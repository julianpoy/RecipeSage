import "./src/sentry-init.server";

import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from "@angular/ssr/node";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import compression from "compression";
import helmet from "helmet";
import * as Sentry from "@sentry/node";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildRobots, buildSitemap } from "./src/sitemap";

const SITE_ORIGIN = process.env["SITE_ORIGIN"];

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, "../browser");

const app = express();
app.set("trust proxy", true);

const angularApp = new AngularNodeAppEngine();

function resolveOrigin(req: Request): string {
  if (SITE_ORIGIN) return SITE_ORIGIN.replace(/\/$/, "");
  const proto = req.protocol;
  const host = req.get("host");
  return `${proto}://${host}`;
}

app.use(compression());
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
  }),
);

app.get("/healthz", (_req, res) => {
  res.status(200).type("text/plain").send("ok");
});

app.get("/sitemap.xml", (req, res) => {
  res.type("application/xml").send(buildSitemap(resolveOrigin(req)));
});

app.get("/robots.txt", (req, res) => {
  res.type("text/plain").send(buildRobots(resolveOrigin(req)));
});

app.use(
  express.static(browserDistFolder, {
    index: false,
    redirect: false,
    setHeaders: (res, filePath) => {
      const name = filePath.split(/[\\/]/).pop() || "";
      if (/-[a-f0-9]{8}\./.test(name)) {
        res.setHeader("Cache-Control", "public, max-age=2592000, immutable");
      } else if (
        name === "index.html" ||
        name === "index.csr.html" ||
        name === "service-worker.js"
      ) {
        res.setHeader("Cache-Control", "public, max-age=3600, must-revalidate");
      } else {
        res.setHeader(
          "Cache-Control",
          "public, max-age=604800, must-revalidate",
        );
      }
    },
  }),
);

app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  Sentry.captureException(err);
  console.error("SSR request failed:", err);
  if (res.headersSent) return;
  res.status(500).type("text/plain").send("Internal Server Error");
});

if (isMainModule(import.meta.url)) {
  if (!SITE_ORIGIN) {
    console.error("SITE_ORIGIN env var is required");
    process.exit(1);
  }

  if (!process.env["SSR_API_BASE_URL"]) {
    console.error("SSR_API_BASE_URL env var is required");
    process.exit(1);
  }

  const port = Number(process.env["PORT"]) || 4000;
  const server = app.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });

  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;
  server.requestTimeout = 30_000;

  const shutdown = (signal: string) => {
    console.log(`Received ${signal}, shutting down`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

export const reqHandler = createNodeRequestHandler(app);
