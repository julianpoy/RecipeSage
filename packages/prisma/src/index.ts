import { PrismaClient, Prisma } from "@prisma/client";

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

export const prisma = new PrismaClient({
  log,
});

if (process.env.NODE_ENV === "development") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (prisma.$on as any)("query", (e: any) => {
    console.log("Query: " + e.query);
    console.log("Params: " + e.params);
    console.log("Duration: " + e.duration + "ms");
  });
}
