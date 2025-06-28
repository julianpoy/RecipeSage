import "./services/sentry-init.js";
import * as Sentry from "@sentry/node";

import {
  NotFoundError,
  ServerError,
  typesafeExpressIndexRouter,
} from "@recipesage/express";

import express from "express";
import path from "path";
import logger from "morgan";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import cors from "cors";

import { trpcExpressMiddleware } from "@recipesage/trpc";

import { setupInvalidateStaleJobsInterval } from "@recipesage/util/server/db";
setupInvalidateStaleJobsInterval();
import { metrics } from "@recipesage/util/server/general";

// Routes
import index from "./routes/index.js";
import users from "./routes/users.js";
import recipes from "./routes/recipes.js";
import labels from "./routes/labels.js";
import messages from "./routes/messages.js";
import shoppingLists from "./routes/shoppingLists.js";
import mealPlans from "./routes/mealPlans.js";
import print from "./routes/print.js";
import payments from "./routes/payments.js";
import images from "./routes/images.js";
import clip from "./routes/clip.js";
import data from "./routes/data.js";
import proxy from "./routes/proxy.js";

import { ErrorRequestHandler } from "express";

const app = express();

const defaultCorsAllowlist = [
  "https://www.recipesage.com",
  "https://recipesage.com",
  "https://beta.recipesage.com",
  "https://api.recipesage.com",
  "https://windows.recipesage.com",
  "https://android.recipesage.com",
  "https://ios.recipesage.com",
  "https://localhost",
  "capacitor://localhost",
  "moz-extension://*",
  "chrome-extension://oepplnnfceidfaaacjpdpobnjkcpgcpo",
  "*", // Temporary fix for 1401, circle back and fix webextension manifests
];

const hostMatch = (pattern: string, origin: string) => {
  if (pattern.endsWith("*")) {
    return origin.startsWith(pattern.substring(0, pattern.length - 1));
  }

  return origin === pattern;
};

const corsOptions = {
  origin: (origin, callback) => {
    if (process.env.CORS_ALLOWLIST) {
      const allowList = process.env.CORS_ALLOWLIST.split(",");
      const allowCors =
        origin && allowList.some((pattern) => hostMatch(pattern, origin));
      callback(null, allowCors);
      return;
    }

    if (process.env.NODE_ENV === "selfhost") {
      // No default allowlist, so we do not know selfhost user's origin
      // we allow all.
      callback(null, true);
      return;
    }

    const allowCors =
      origin &&
      defaultCorsAllowlist.some((pattern) => hostMatch(pattern, origin));
    callback(null, allowCors);
  },
} satisfies cors.CorsOptions;

app.use(cors(corsOptions));
app.use(cookieParser());

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

if (process.env.NODE_ENV !== "test") app.use(logger("dev"));
app.use(
  bodyParser.json({
    limit: "250MB",
    verify: (req, res, buf) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const url = (req as any).originalUrl;
      if (url.startsWith("/payments/stripe/webhooks")) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (req as any).rawBody = buf.toString();
      }
    },
  }),
);

app.use(function (req, res, next) {
  const timer = metrics.apiRequest.startTimer();
  res.on("finish", function () {
    const time = timer();
    const path = req.baseUrl + (req.route?.path || req.path);
    metrics.apiRequest.observe(
      {
        status_code: res.statusCode,
        method: req.method,
        path,
      },
      time,
    );
  });

  next();
});

app.use(bodyParser.urlencoded({ limit: "250MB", extended: false }));
app.use(cookieParser());
app.disable("x-powered-by");
app.use("/", typesafeExpressIndexRouter);
app.use("/", index);
app.use("/trpc", trpcExpressMiddleware);
app.use("/users", users);
app.use("/recipes", recipes);
app.use("/labels", labels);
app.use("/messages", messages);
app.use("/shoppingLists", shoppingLists);
app.use("/mealPlans", mealPlans);
app.use("/print", print);
app.use("/payments", payments);
app.use("/images", images);
app.use("/clip", clip);
app.use("/proxy", proxy);
app.use("/data", data);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  const err = new NotFoundError("Not Found");
  next(err);
});

const logError = (err: ServerError) => {
  // Do not log expected RESTful errors
  const isExpectedError = err.status < 500 || err.status > 599;
  if (isExpectedError) return;

  console.error(err);
};

const appErrorHandler: ErrorRequestHandler = function (_err, req, res, _next) {
  const err = _err as ServerError;
  if (!err.status) err.status = 500;

  // set locals, only providing error in development
  res.locals.message = err.message;

  res.locals.error = process.env.NODE_ENV === "production" ? {} : err;

  logError(err);

  // render the error page
  res.status(err.status);
  res.render("error");
};

Sentry.setupExpressErrorHandler(app);
app.use(appErrorHandler);

export { app };

export default app;
