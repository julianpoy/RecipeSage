import { PrismaClient, Prisma } from "@prisma/client";
import cursorStream from "@julianpoy/prisma-cursorstream";
import client from "prom-client";

const prismaQuery = new client.Histogram({
  name: "prisma_query",
  help: "Every time a query is made by the prisma client",
  labelNames: [],
  buckets: [3, 5, 10, 20, 40, 70, 100, 200, 500, 1000, 5000], // Each of these is tracked in milliseconds
});

export * from "./types";

const log: Prisma.LogDefinition[] = [
  {
    level: "error",
    emit: "stdout",
  },
  {
    level: "info",
    emit: "stdout",
  },
  {
    level: "warn",
    emit: "stdout",
  },
  {
    level: "query",
    emit: "event",
  },
];

const _prisma = new PrismaClient({
  log,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(_prisma.$on as any)("query", (e: any) => {
  if (process.env.PRISMA_DEBUG_ENABLE === "true") {
    console.log("Query: " + e.query);
    console.log("Params: " + e.params);
    console.log("Duration: " + e.duration + "ms");
  }
  prismaQuery.observe(e.duration);
});

export const prisma = _prisma.$extends(cursorStream);

export type PrismaTransactionClient = Parameters<
  Parameters<typeof prisma.$transaction>[0]
>[0];
