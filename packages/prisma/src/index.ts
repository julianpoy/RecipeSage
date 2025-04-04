import { PrismaClient, Prisma } from "@prisma/client";
import cursorStream from "@julianpoy/prisma-cursorstream";

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
];

if (process.env.NODE_ENV === "development") {
  log.push({
    level: "query",
    emit: "event",
  });
}

const _prisma = new PrismaClient({
  log,
});

if (process.env.PRISMA_DEBUG_ENABLE === "true") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (_prisma.$on as any)("query", (e: any) => {
    console.log("Query: " + e.query);
    console.log("Params: " + e.params);
    console.log("Duration: " + e.duration + "ms");
  });
}

export const prisma = _prisma.$extends(cursorStream);

export type PrismaTransactionClient = Parameters<
  Parameters<typeof prisma.$transaction>[0]
>[0];
