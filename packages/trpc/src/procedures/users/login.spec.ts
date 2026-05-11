import { prisma } from "@recipesage/prisma";
import { faker } from "@faker-js/faker";
import { generatePasswordHash } from "@recipesage/util/server/general";
import { anonymousTrpc } from "../../testutils";

const createPasswordUser = async (password: string) => {
  const email = faker.internet.email().toLowerCase();
  const passwordInfo = await generatePasswordHash(password);
  const user = await prisma.user.create({
    data: {
      name: faker.person.fullName(),
      email,
      passwordHash: passwordInfo.hash,
      passwordSalt: passwordInfo.salt,
      passwordVersion: passwordInfo.version,
    },
  });
  return { email, user };
};

describe("login", () => {
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
    test("returns a session for valid credentials", async () => {
      const password = faker.internet.password({ length: 12 });
      const { email, user } = await createPasswordUser(password);
      createdEmails.push(email);

      const response = await anonymousTrpc.users.login({ email, password });

      expect(response.userId).toEqual(user.id);
      expect(response.email).toEqual(email);

      const session = await prisma.session.findFirst({
        where: { token: response.token },
      });
      expect(session?.userId).toEqual(user.id);
    });

    test("matches the email case-insensitively", async () => {
      const password = faker.internet.password({ length: 12 });
      const { email } = await createPasswordUser(password);
      createdEmails.push(email);

      const response = await anonymousTrpc.users.login({
        email: email.toUpperCase(),
        password,
      });

      expect(response.email).toEqual(email);
    });

    test("advances lastLogin past its previous value", async () => {
      const password = faker.internet.password({ length: 12 });
      const { email, user } = await createPasswordUser(password);
      createdEmails.push(email);
      const originalLastLogin = new Date("2020-01-01T00:00:00Z");
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: originalLastLogin },
      });

      await anonymousTrpc.users.login({ email, password });

      const updated = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(updated.lastLogin?.getTime()).toBeGreaterThan(
        originalLastLogin.getTime(),
      );
    });
  });

  describe("error", () => {
    test("throws when the user does not exist", async () => {
      const email = faker.internet.email().toLowerCase();

      await expect(
        anonymousTrpc.users.login({ email, password: "anything" }),
      ).rejects.toThrow("An account with that email address was not found");
    });

    test("throws when the account has no password", async () => {
      const email = faker.internet.email().toLowerCase();
      await prisma.user.create({
        data: { name: faker.person.fullName(), email },
      });
      createdEmails.push(email);

      await expect(
        anonymousTrpc.users.login({ email, password: "anything" }),
      ).rejects.toThrow(
        "This account does not have a password setup, and instead uses an SSO provider",
      );
    });

    test("throws when the password is incorrect", async () => {
      const password = faker.internet.password({ length: 12 });
      const { email } = await createPasswordUser(password);
      createdEmails.push(email);

      await expect(
        anonymousTrpc.users.login({ email, password: "wrong-password" }),
      ).rejects.toThrow("The password provided is incorrect");
    });
  });
});
