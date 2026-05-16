import { prisma } from "@recipesage/prisma";
import { faker } from "@faker-js/faker";
import { validatePasswordHash } from "@recipesage/util/server/general";
import { anonymousTrpc } from "../../testutils";

describe("register", () => {
  const createdEmails: string[] = [];

  afterEach(async () => {
    if (createdEmails.length === 0) return;
    await prisma.user.deleteMany({
      where: {
        email: {
          in: createdEmails.splice(0, createdEmails.length),
        },
      },
    });
  });

  describe("success", () => {
    test("creates a new user and returns a session", async () => {
      const email = faker.internet.email().toLowerCase();
      const name = faker.person.fullName();
      const password = faker.internet.password({ length: 12 });
      createdEmails.push(email);

      const response = await anonymousTrpc.users.register({
        name,
        email,
        password,
      });

      expect(response.email).toEqual(email);

      const user = await prisma.user.findUnique({ where: { email } });
      expect(user?.id).toEqual(response.userId);
      expect(user?.name).toEqual(name);
      if (!user?.passwordHash || !user.passwordSalt || !user.passwordVersion) {
        throw new Error("password credentials missing after register");
      }
      expect(
        await validatePasswordHash(password, {
          passwordHash: user.passwordHash,
          passwordSalt: user.passwordSalt,
          passwordVersion: user.passwordVersion,
        }),
      ).toEqual(true);

      const session = await prisma.session.findFirst({
        where: { token: response.token },
      });
      expect(session?.userId).toEqual(response.userId);
    });

    test("normalizes the stored email to lowercase", async () => {
      const lower = faker.internet.email().toLowerCase();
      createdEmails.push(lower);

      const response = await anonymousTrpc.users.register({
        name: faker.person.fullName(),
        email: lower.toUpperCase(),
        password: faker.internet.password({ length: 12 }),
      });

      expect(response.email).toEqual(lower);
    });
  });

  describe("error", () => {
    test("throws when registration is disabled via env", async () => {
      vi.stubEnv("DISABLE_REGISTRATION", "true");

      try {
        await expect(
          anonymousTrpc.users.register({
            name: faker.person.fullName(),
            email: faker.internet.email().toLowerCase(),
            password: faker.internet.password({ length: 12 }),
          }),
        ).rejects.toThrow(
          "Registration is disabled via the DISABLE_REGISTRATION environment variable.",
        );
      } finally {
        vi.unstubAllEnvs();
      }
    });

    test("throws when an account with the email already exists", async () => {
      const email = faker.internet.email().toLowerCase();
      await prisma.user.create({
        data: { name: faker.person.fullName(), email },
      });
      createdEmails.push(email);

      await expect(
        anonymousTrpc.users.register({
          name: faker.person.fullName(),
          email,
          password: faker.internet.password({ length: 12 }),
        }),
      ).rejects.toThrow("An account with that email address already exists");
    });
  });
});
