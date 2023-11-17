import { prisma } from "..";

export const initAssistantUser = async () => {
  const assistantUser = await prisma.user.upsert({
    create: {
      name: "RecipeSage Cooking Assistant",
      email: "assistant@recipesage.com",
      passwordHash: "nologin",
      passwordSalt: "nologin",
      passwordVersion: 2,
      handle: "assistant",
      enableProfile: true,
    },
    where: {
      email: "assistant@recipesage.com",
    },
    update: {},
  });

  const existingProfileItem = await prisma.profileItem.findFirst({
    where: {
      userId: assistantUser.id,
      order: 0,
    },
  });

  if (!existingProfileItem) {
    await prisma.profileItem.create({
      data: {
        userId: assistantUser.id,
        type: "all-recipes",
        title: "Created by RecipeSage Cooking Assistant",
        visibility: "public",
        order: 0,
      },
    });
  }
};
