import { trpcSetup, tearDown } from "../../testutils";
import { recipeFactory } from "../../factories/recipeFactory";
import { prisma } from "@recipesage/prisma";
import { User } from "@prisma/client";
import type { CreateTRPCProxyClient } from "@trpc/client";
import type { AppRouter } from "../../index";
import { getLabelsByUserId } from "./getLabelsByUserId";
import { title } from "process";
import { rootCertificates } from "tls";

describe("getLabels", () => {
  let user: User;
  let trpc: CreateTRPCProxyClient<AppRouter>;

  beforeEach(async () => {
    ({ user, trpc } = await trpcSetup());
  });

  afterEach(() => {
    return tearDown(user.id);
  });

  describe("success", () => {
    it("get label", async () => {
      const label = await prisma.label.create({
        data: {
          userId: user.id,
          title: "meat",
        },
      });
      const response = await trpc.labels.getLabels.query();
      expect(response[0].title).toEqual("meat");
    });
  });
});
