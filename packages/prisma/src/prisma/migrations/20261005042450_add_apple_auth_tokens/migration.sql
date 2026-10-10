-- CreateTable
CREATE TABLE "AppleAuthTokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "clientId" VARCHAR(255) NOT NULL,
    "appleUserId" VARCHAR(255) NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AppleAuthTokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppleAuthTokens_userId_clientId_key" ON "AppleAuthTokens"("userId", "clientId");

-- AddForeignKey
ALTER TABLE "AppleAuthTokens" ADD CONSTRAINT "AppleAuthTokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
