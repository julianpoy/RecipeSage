import { prisma } from "@recipesage/prisma";
import { faker } from "@faker-js/faker";
import { anonymousTrpc } from "../../testutils";

const { verifyIdTokenMock } = vi.hoisted(() => ({
  verifyIdTokenMock: vi.fn(),
}));

vi.mock("apple-signin-auth", () => ({
  default: {
    verifyIdToken: verifyIdTokenMock,
  },
}));

const setVerifiedEmail = (email: string) => {
  verifyIdTokenMock.mockResolvedValue({ email, email_verified: true });
};

describe("signInWithApple", () => {
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

      const response = await anonymousTrpc.users.signInWithApple({
        identityToken: "valid-token",
        allowRegistration: false,
      });

      expect(response.userId).toEqual(created.id);
      expect(response.email).toEqual(email);

      const session = await prisma.session.findFirst({
        where: { token: response.token },
      });
      expect(session?.userId).toEqual(created.id);
    });

    test("creates a new user with the provided name when the email is unknown", async () => {
      const email = faker.internet.email().toLowerCase();
      createdEmails.push(email);
      setVerifiedEmail(email);

      const response = await anonymousTrpc.users.signInWithApple({
        identityToken: "valid-token",
        name: "New Apple User",
        allowRegistration: true,
      });

      const user = await prisma.user.findUnique({
        where: { email },
      });
      expect(user?.id).toEqual(response.userId);
      expect(user?.name).toEqual("New Apple User");
    });

    test("accepts the string form of email_verified", async () => {
      const email = faker.internet.email().toLowerCase();
      createdEmails.push(email);
      verifyIdTokenMock.mockResolvedValue({
        email,
        email_verified: "true",
      });

      const response = await anonymousTrpc.users.signInWithApple({
        identityToken: "valid-token",
      });

      expect(response.email).toEqual(email);
    });

    test("normalizes the verified email to lowercase", async () => {
      const lower = faker.internet.email().toLowerCase();
      createdEmails.push(lower);
      setVerifiedEmail(lower.toUpperCase());

      const response = await anonymousTrpc.users.signInWithApple({
        identityToken: "valid-token",
      });

      expect(response.email).toEqual(lower);
    });
  });

  describe("error", () => {
    test("throws when allowRegistration is false and the user does not exist", async () => {
      const email = faker.internet.email().toLowerCase();
      setVerifiedEmail(email);

      await expect(
        anonymousTrpc.users.signInWithApple({
          identityToken: "valid-token",
          allowRegistration: false,
        }),
      ).rejects.toThrow("An account with that email address was not found");

      const user = await prisma.user.findUnique({
        where: { email },
      });
      expect(user).toBeNull();
    });

    test("throws when the identity token cannot be verified", async () => {
      verifyIdTokenMock.mockRejectedValue(new Error("bad token"));

      await expect(
        anonymousTrpc.users.signInWithApple({
          identityToken: "invalid-token",
        }),
      ).rejects.toThrow("Invalid identity token");
    });

    test("throws when the verified payload email is not verified", async () => {
      const email = faker.internet.email().toLowerCase();
      verifyIdTokenMock.mockResolvedValue({
        email,
        email_verified: false,
      });

      await expect(
        anonymousTrpc.users.signInWithApple({
          identityToken: "valid-token",
        }),
      ).rejects.toThrow("Invalid identity token");

      const user = await prisma.user.findUnique({
        where: { email },
      });
      expect(user).toBeNull();
    });
  });

  describe("audience", () => {
    test("verifies against the configured services id and bundle id", async () => {
      const email = faker.internet.email().toLowerCase();
      createdEmails.push(email);
      setVerifiedEmail(email);

      await anonymousTrpc.users.signInWithApple({
        identityToken: "valid-token",
      });

      expect(verifyIdTokenMock).toHaveBeenCalledWith(
        "valid-token",
        expect.objectContaining({
          audience: ["com.recipesage.service", "com.recipesage.ios"],
        }),
      );
    });
  });
});
