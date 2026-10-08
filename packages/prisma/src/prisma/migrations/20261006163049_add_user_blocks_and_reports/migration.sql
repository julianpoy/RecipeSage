-- CreateEnum
CREATE TYPE "UserReportStatus" AS ENUM ('OPEN', 'ACTIONED', 'DISMISSED');

-- CreateTable
CREATE TABLE "UserBlocks" (
    "id" UUID NOT NULL,
    "blockerUserId" UUID NOT NULL,
    "blockedUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "UserBlocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserReports" (
    "id" UUID NOT NULL,
    "reporterUserId" UUID,
    "reportedUserId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "UserReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "UserReports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserBlocks_blockedUserId_idx" ON "UserBlocks"("blockedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "UserBlocks_blockerUserId_blockedUserId_key" ON "UserBlocks"("blockerUserId", "blockedUserId");

-- CreateIndex
CREATE INDEX "UserReports_reporterUserId_idx" ON "UserReports"("reporterUserId");

-- CreateIndex
CREATE INDEX "UserReports_status_createdAt_idx" ON "UserReports"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserReports_reportedUserId_reporterUserId_key" ON "UserReports"("reportedUserId", "reporterUserId");

-- AddForeignKey
ALTER TABLE "UserBlocks" ADD CONSTRAINT "UserBlocks_blockerUserId_fkey" FOREIGN KEY ("blockerUserId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBlocks" ADD CONSTRAINT "UserBlocks_blockedUserId_fkey" FOREIGN KEY ("blockedUserId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReports" ADD CONSTRAINT "UserReports_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReports" ADD CONSTRAINT "UserReports_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
