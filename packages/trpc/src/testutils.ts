import { prisma } from "@recipesage/prisma";
import type { Session, User } from "@recipesage/prisma";
import { faker } from "@faker-js/faker";
import { test as baseTest } from "vitest";
import { appRouter } from "./index";
import { createCallerFactory } from "./trpc";

export const createCaller = createCallerFactory(appRouter);

export const anonymousTrpc = createCaller({ session: null, language: "" });

interface TrpcFixtures {
  user: User;
  user2: User;
  session: Session;
  session2: Session;
  trpc: ReturnType<typeof createCaller>;
  trpc2: ReturnType<typeof createCaller>;
}

export const test = baseTest.extend<TrpcFixtures>({
  // eslint-disable-next-line no-empty-pattern
  user: async ({}, use) => {
    const user = await createUser();
    await use(user);
    await prisma.user.deleteMany({ where: { id: user.id } });
  },
  // eslint-disable-next-line no-empty-pattern
  user2: async ({}, use) => {
    const user = await createUser();
    await use(user);
    await prisma.user.deleteMany({ where: { id: user.id } });
  },
  session: async ({ user }, use) => {
    const session = await createSession(user.id);
    await use(session);
  },
  session2: async ({ user2 }, use) => {
    const session = await createSession(user2.id);
    await use(session);
  },
  trpc: async ({ session }, use) => {
    await use(createCaller({ session, language: "" }));
  },
  trpc2: async ({ session2 }, use) => {
    await use(createCaller({ session: session2, language: "" }));
  },
});

export async function createUser() {
  return prisma.user.create({
    data: {
      name: faker.person.fullName(),
      email: faker.internet.email().toLowerCase(),
      passwordHash:
        "SaVNC9ubXV8BHykB2wAD0mhxPwh/W7O7Rz+qRy/PeV+GeeakLzkv2TSghPQvLTe07b7TqxdsRUt39lC3RaaWmhORkVS9UbtEIh9dzvcbj9VzHA0ex0k97nv0lE56Jh6D6M5Laxe2BrkpiUibP3yCDCk75vCHtLGTZVjqtabTGheIs/QwiD72C7H+bK4QSL2RYSOEbB0wysNAC5nF8r1m36FB/DS5wEixOWiQH470H1s9yHODAALNag9Lom+It4P3cMSSa83mxPNvFOniEpuDDcI5W/Oxef/XiA3EhMLL8n4+CSV1Z891g65U7j7RIKSCjK1LbCvQ5JuS/jZCErNBW9472TXdGKGeYY6RTDgSBzqISyxlMCSRBsNjToWHJyPEyEbt0BTSjTkliB+0wSQpdzUiDDiJNrLVimAriH/AcU/eFvpU5YyyY1coY8Kc80LxKxP/p881Q0DABCmaRcDH+/1iEz3SoWNvSsw/Xq8u9LcgKCjccDoD8tKBDkMijS7TBPu9zJd2nUqblPO+KTGz7hVqh/u0VQ+xEdvRQuKSc+4OnUtQRVCAFQGB99hfXfQvffeGosNy3BABEuZkobaUgs8m8RTaRFGqy8qk6BYw1bk5I5KjjmA8GNOtNHlKQ+1EZO83pIKbG61Jfm93FJ6CsWji9fXsxaBsv+JNBhRgmUw=",
      passwordSalt:
        "dM4YXu5N5XY4c0LXnf30vtshh7dgsBYZ/5pZockgcJofPkWhMOplVAoWKhyqODZhO3mSUBqMqo3kXC2+7fOMt1NFB0Q1iRcJ4zaqAqdTenyjXu7rJ8WpgR1qnTcnpP8g/frQ+sk8Kcv49OC84R3v+FD8RrGm0rz8dDt7m7c/+Rw=",
      passwordVersion: 2,
    },
  });
}

export async function createSession(userId: string) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return prisma.session.create({
    data: {
      userId,
      token: faker.string.alphanumeric(40),
      type: "user",
      expires: tomorrow,
    },
  });
}
