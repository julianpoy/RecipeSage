import { prisma } from "@recipesage/prisma";
import { faker } from "@faker-js/faker";
import { anonymousTrpc } from "../../testutils";

const verifyIdTokenMock = vi.fn();

vi.mock("google-auth-library", () => ({
  OAuth2Client: class {
    verifyIdToken = verifyIdTokenMock;
  },
}));

const setVerifiedEmail = (email: string) => {
  verifyIdTokenMock.mockResolvedValue({
    getPayload: () => ({ email, email_verified: true }),
  });
};

describe("signInWithGoogle", () => {
  const createdEmails: string[] = [];

  beforeEach(() => {
    verifyIdTokenMock.mockReset();
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
    test("returns a session for an existing user when allowRegistration is false", async () => {
      const email = faker.internet.email().toLowerCase();
      const created = await prisma.user.create({
        data: {
          name: faker.person.fullName(),
          email,
        },
      });
      createdEmails.push(email);
      setVerifiedEmail(email);

      const response = await anonymousTrpc.users.signInWithGoogle({
        clientId: "test-client-id",
        credential: "valid-credential",
        allowRegistration: false,
      });

      expect(response.userId).toEqual(created.id);
      expect(response.email).toEqual(email);

      const session = await prisma.session.findFirst({
        where: { token: response.token },
      });
      expect(session?.userId).toEqual(created.id);
    });

    test("creates a new user when allowRegistration is true and the email is unknown", async () => {
      const email = faker.internet.email().toLowerCase();
      createdEmails.push(email);
      setVerifiedEmail(email);

      const response = await anonymousTrpc.users.signInWithGoogle({
        clientId: "test-client-id",
        credential: "valid-credential",
        allowRegistration: true,
      });

      expect(response.email).toEqual(email);
      const user = await prisma.user.findUnique({
        where: { email },
      });
      expect(user?.id).toEqual(response.userId);
    });

    test("creates a new user when allowRegistration is omitted (defaults to true)", async () => {
      const email = faker.internet.email().toLowerCase();
      createdEmails.push(email);
      setVerifiedEmail(email);

      const response = await anonymousTrpc.users.signInWithGoogle({
        clientId: "test-client-id",
        credential: "valid-credential",
      });

      const user = await prisma.user.findUnique({
        where: { email },
      });
      expect(user?.id).toEqual(response.userId);
    });

    test("updates lastLogin for an existing user when allowRegistration is true", async () => {
      const email = faker.internet.email().toLowerCase();
      const originalLastLogin = new Date("2020-01-01T00:00:00Z");
      const original = await prisma.user.create({
        data: {
          name: faker.person.fullName(),
          email,
          lastLogin: originalLastLogin,
        },
      });
      createdEmails.push(email);
      setVerifiedEmail(email);

      await anonymousTrpc.users.signInWithGoogle({
        clientId: "test-client-id",
        credential: "valid-credential",
        allowRegistration: true,
      });

      const updated = await prisma.user.findUnique({
        where: { id: original.id },
      });
      expect(updated?.lastLogin?.getTime()).toBeGreaterThan(
        originalLastLogin.getTime(),
      );
    });

    test("normalizes the verified email to lowercase", async () => {
      const lower = faker.internet.email().toLowerCase();
      createdEmails.push(lower);
      setVerifiedEmail(lower.toUpperCase());

      const response = await anonymousTrpc.users.signInWithGoogle({
        clientId: "test-client-id",
        credential: "valid-credential",
        allowRegistration: true,
      });

      expect(response.email).toEqual(lower);
    });
  });

  describe("error", () => {
    test("throws when allowRegistration is false and the user does not exist", async () => {
      const email = faker.internet.email().toLowerCase();
      setVerifiedEmail(email);

      await expect(
        anonymousTrpc.users.signInWithGoogle({
          clientId: "test-client-id",
          credential: "valid-credential",
          allowRegistration: false,
        }),
      ).rejects.toThrow("An account with that email address was not found");

      const user = await prisma.user.findUnique({
        where: { email },
      });
      expect(user).toBeNull();
    });

    test("throws when the verified payload has no email", async () => {
      verifyIdTokenMock.mockResolvedValue({
        getPayload: () => ({}),
      });

      await expect(
        anonymousTrpc.users.signInWithGoogle({
          clientId: "test-client-id",
          credential: "valid-credential",
        }),
      ).rejects.toThrow("Invalid clientId or credential");
    });

    test("throws when the verified payload email is not verified", async () => {
      const email = faker.internet.email().toLowerCase();
      verifyIdTokenMock.mockResolvedValue({
        getPayload: () => ({ email, email_verified: false }),
      });

      await expect(
        anonymousTrpc.users.signInWithGoogle({
          clientId: "test-client-id",
          credential: "valid-credential",
        }),
      ).rejects.toThrow("Invalid clientId or credential");

      const user = await prisma.user.findUnique({
        where: { email },
      });
      expect(user).toBeNull();
    });
  });

  describe("audience", () => {
    test("verifies against the configured client id, not the caller supplied one", async () => {
      const email = faker.internet.email().toLowerCase();
      createdEmails.push(email);
      setVerifiedEmail(email);

      await anonymousTrpc.users.signInWithGoogle({
        clientId: "attacker-controlled-client-id",
        credential: "valid-credential",
      });

      expect(verifyIdTokenMock).toHaveBeenCalledWith(
        expect.objectContaining({
          audience: "test-client-id",
        }),
      );
    });
  });
});
