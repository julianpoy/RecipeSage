import "./services/sentry-init.js";
import * as Sentry from "@sentry/node";

import * as express from "express";
import * as path from "path";
import * as logger from "morgan";
import * as cookieParser from "cookie-parser";
import * as bodyParser from "body-parser";
import * as cors from "cors";

import { trpcExpressMiddleware } from "@recipesage/trpc";

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

import ws from "./routes/ws.js";

const app = express();

const corsWhitelist = [
  "https://www.recipesage.com",
  "https://recipesage.com",
  "https://beta.recipesage.com",
  "https://api.recipesage.com",
  "https://localhost",
  "capacitor://localhost",
];
const corsOptions = {
  origin: (origin, callback) => {
    if (corsWhitelist.indexOf(origin) !== -1) {
      callback(null, true); // Enable CORS for whitelisted domains
    } else {
      callback(null, { origin: false }); // Disable CORS, domain not on whitelist
    }
  },
};

app.options("*", cors(corsOptions));
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
      const url = req.originalUrl;
      if (url.startsWith("/payments/stripe/webhooks")) {
        req.rawBody = buf.toString();
      }
    },
  }),
);
app.use(bodyParser.urlencoded({ limit: "250MB", extended: false }));
app.use(cookieParser());
app.disable("x-powered-by");
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
app.use("/ws", ws);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  const err = new Error("Not Found");
  err.status = 404;
  next(err);
});

let logError = (err) => {
  // Do not log expected RESTful errors
  let isExpectedError = err.status < 500 || err > 599;
  if (isExpectedError) return;

  console.error(err);

  Sentry.captureException(err);
};

// error handler
app.use(function (err, req, res) {
  // set locals, only providing error in development
  res.locals.message = err.message;

  if (!err.status) err.status = 500;

  res.locals.error = process.env.NODE_ENV === "production" ? {} : err;

  logError(err);

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

export { app };

export default app;
