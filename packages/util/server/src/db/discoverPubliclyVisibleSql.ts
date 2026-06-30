import {
  Prisma,
  DiscoverApprovalState,
  UserDiscoverStanding,
} from "@recipesage/prisma";

export const discoverPubliclyVisibleSql = Prisma.sql`"approvalState" = ${DiscoverApprovalState.ACTIVE}::"DiscoverApprovalState" AND "deletedAt" IS NULL AND NOT EXISTS (SELECT 1 FROM "Users" WHERE "Users".id = "Discover_Recipes"."authorId" AND "Users"."discoverStanding" = ${UserDiscoverStanding.SHADOWBANNED}::"UserDiscoverStanding")`;
