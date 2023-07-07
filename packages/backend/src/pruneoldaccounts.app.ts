import "./services/sentry-init";
import * as Sentry from "@sentry/node";
import { program } from "commander";

import { prisma } from "@recipesage/prisma";
import { sendAccountStale } from "./services/email/accountStale";

program
  .option("--delete", "Delete matching users", false)
  .option("--email", "Email matching users", false)
  .option(
    "--before [days]",
    "How many days of inactivity to consider stale",
    "365"
  )
  .option(
    "--limit [number]",
    "Max number of users for this run, 0 is unlimited",
    "0"
  )
  .parse(process.argv);
const opts = program.opts();
const options = {
  delete: Boolean(opts.delete),
  email: Boolean(opts.email),
  before: parseInt(opts.before, 10),
  limit: parseInt(opts.limit || "0", 10) || undefined,
};

const waitFor = async (timeout: number) => {
  new Promise((resolve) => {
    setTimeout(resolve, timeout);
  });
};

const run = async () => {
  try {
    const lt = new Date();
    lt.setDate(lt.getDate() - options.before);

    const users = await prisma.user.findMany({
      where: {
        createdAt: {
          lt,
        },
        sessions: {
          none: {},
        },
        OR: [
          {
            lastLogin: null,
          },
          {
            lastLogin: {
              lt,
            },
          },
        ],
      },
      take: options.limit,
    });

    if (!users.length) {
      console.log("No stale users found");
      process.exit(0);
    }

    console.log(users.map((user) => user.email).join("\n"));
    console.log(users.length);

    if (options.email && process.env.NODE_ENV === "production") {
      for (const user of users) {
        // TODO: Convert email to non-nullable col
        if (user.email) {
          await sendAccountStale([user.email], []);
          await waitFor(250); // Cooldown for SES
        }
      }
    }

    if (options.delete) {
      await prisma.user.deleteMany({
        where: {
          id: {
            in: users.map((user) => user.id),
          },
        },
      });
    }
  } catch (e) {
    Sentry.captureException(e);
    console.log("Error while indexing", e);
    process.exit(1);
  }
};

run();

process.on("SIGTERM", () => {
  console.log("RECEIVED SIGTERM - STOPPING JOB");
  process.exit(0);
});
