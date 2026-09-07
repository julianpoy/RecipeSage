ALTER TABLE "UserSubscriptions" ADD COLUMN     "currentStoreTransactionId" UUID,
ADD COLUMN     "platform" VARCHAR(255) NOT NULL DEFAULT 'STRIPE';

CREATE TABLE "StoreTransactions" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "platform" VARCHAR(255) NOT NULL,
    "externalId" TEXT NOT NULL,
    "revokedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreTransactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StoreNotificationEvents" (
    "id" UUID NOT NULL,
    "platform" VARCHAR(255) NOT NULL,
    "externalId" VARCHAR(255) NOT NULL,
    "userId" UUID,
    "blob" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "StoreNotificationEvents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StoreTransactions_platform_externalId_key" ON "StoreTransactions"("platform", "externalId");

CREATE INDEX "StoreTransactions_userId_idx" ON "StoreTransactions"("userId");

CREATE INDEX "StoreNotificationEvents_userId_idx" ON "StoreNotificationEvents"("userId");

CREATE UNIQUE INDEX "StoreNotificationEvents_platform_externalId_key" ON "StoreNotificationEvents"("platform", "externalId");

CREATE INDEX "UserSubscriptions_currentStoreTransactionId_idx" ON "UserSubscriptions"("currentStoreTransactionId");

DELETE FROM "UserSubscriptions"
WHERE "id" IN (
    SELECT "id"
    FROM (
        SELECT
            "id",
            ROW_NUMBER() OVER (
                PARTITION BY "userId", "name", "platform"
                ORDER BY
                    ("expires" IS NULL) DESC,
                    "expires" DESC,
                    "updatedAt" DESC,
                    "id"
            ) AS "rowNumber"
        FROM "UserSubscriptions"
    ) AS "rankedSubscriptions"
    WHERE "rowNumber" > 1
);

CREATE UNIQUE INDEX "UserSubscriptions_userId_name_platform_key" ON "UserSubscriptions"("userId", "name", "platform");

ALTER TABLE "StoreTransactions" ADD CONSTRAINT "StoreTransactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StoreNotificationEvents" ADD CONSTRAINT "StoreNotificationEvents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UserSubscriptions" ADD CONSTRAINT "UserSubscriptions_currentStoreTransactionId_fkey" FOREIGN KEY ("currentStoreTransactionId") REFERENCES "StoreTransactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
