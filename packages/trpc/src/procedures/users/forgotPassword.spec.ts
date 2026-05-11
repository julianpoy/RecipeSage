import { prisma } from "@recipesage/prisma";
import { faker } from "@faker-js/faker";
import { anonymousTrpc } from "../../testutils";

const { sendPasswordResetEmailMock } = vi.hoisted(() => ({
  sendPasswordResetEmailMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@recipesage/util/server/general", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@recipesage/util/server/general")>();
  return {
    ...actual,
    sendPasswordResetEmail: sendPasswordResetEmailMock,
  };
});

describe("forgotPassword", () => {
  const createdEmails: string[] = [];

  beforeEach(() => {
    sendPasswordResetEmailMock.mockClear();
  });

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
    test("creates a reset session and sends the reset email", async () => {
      const email = faker.internet.email().toLowerCase();
      const user = await prisma.user.create({
        data: {
          name: faker.person.fullName(),
          email,
        },
      });
      createdEmails.push(email);

      const response = await anonymousTrpc.users.forgotPassword({ email });
      expect(response).toEqual("Email sent");

      const sessions = await prisma.session.findMany({
        where: { userId: user.id },
      });
      expect(sessions.length).toEqual(1);

      expect(sendPasswordResetEmailMock).toHaveBeenCalledTimes(1);
      const call = sendPasswordResetEmailMock.mock.calls[0][0];
      expect(call.toAddresses).toEqual([email]);
      expect(call.resetLink).toContain(sessions[0].token);
    });

    test("matches the email case-insensitively", async () => {
      const email = faker.internet.email().toLowerCase();
      const user = await prisma.user.create({
        data: {
          name: faker.person.fullName(),
          email,
        },
      });
      createdEmails.push(email);

      await anonymousTrpc.users.forgotPassword({ email: email.toUpperCase() });

      const sessions = await prisma.session.findMany({
        where: { userId: user.id },
      });
      expect(sessions.length).toEqual(1);
    });
  });

  describe("error", () => {
    test("throws when no user matches the email", async () => {
      const email = faker.internet.email().toLowerCase();

      await expect(
        anonymousTrpc.users.forgotPassword({ email }),
      ).rejects.toThrow("An account with that email address was not found");
      expect(sendPasswordResetEmailMock).not.toHaveBeenCalled();
    });
  });
});
