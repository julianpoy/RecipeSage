import { prisma } from "@recipesage/prisma";
import { faker } from "@faker-js/faker";
import crypto from "node:crypto";
import { anonymousTrpc } from "../../testutils";

const TEST_SECRET = "test-client-secret";

const originalEnv = vi.hoisted(() => {
  const previous = {
    GOOGLE_GSI_CLIENT_ID: process.env.GOOGLE_GSI_CLIENT_ID,
    GOOGLE_GSI_CLIENT_SECRET: process.env.GOOGLE_GSI_CLIENT_SECRET,
  };
  process.env.GOOGLE_GSI_CLIENT_ID = "test-client-id";
  process.env.GOOGLE_GSI_CLIENT_SECRET = "test-client-secret";
  return previous;
});

afterAll(() => {
  if (originalEnv.GOOGLE_GSI_CLIENT_ID === undefined) {
    delete process.env.GOOGLE_GSI_CLIENT_ID;
  } else {
    process.env.GOOGLE_GSI_CLIENT_ID = originalEnv.GOOGLE_GSI_CLIENT_ID;
  }
  if (originalEnv.GOOGLE_GSI_CLIENT_SECRET === undefined) {
    delete process.env.GOOGLE_GSI_CLIENT_SECRET;
  } else {
    process.env.GOOGLE_GSI_CLIENT_SECRET = originalEnv.GOOGLE_GSI_CLIENT_SECRET;
  }
});

const makeCode = (
  payload: {
    email: string;
    name: string;
    allowRegistration: boolean;
    exp: number;
  },
  secret = TEST_SECRET,
) => {
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const hmac = crypto
    .createHmac("sha256", secret)
    .update(payloadB64)
    .digest("hex");
  return `${payloadB64}.${hmac}`;
};

describe("signInWithDesktopGoogle", () => {
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
    test("returns a session for an existing user even when allowRegistration is false", async () => {
      const email = faker.internet.email().toLowerCase();
      const created = await prisma.user.create({
        data: {
          name: faker.person.fullName(),
          email,
        },
      });
      createdEmails.push(email);

      const response = await anonymousTrpc.users.signInWithDesktopGoogle({
        code: makeCode({
          email,
          name: "Test",
          allowRegistration: false,
          exp: Date.now() + 60_000,
        }),
      });

      expect(response.userId).toEqual(created.id);
      expect(response.email).toEqual(email);

      const session = await prisma.session.findFirst({
        where: { token: response.token },
      });
      expect(session?.userId).toEqual(created.id);
    });

    test("creates a new user when the email is unknown and allowRegistration is true", async () => {
      const email = faker.internet.email().toLowerCase();
      createdEmails.push(email);

      const response = await anonymousTrpc.users.signInWithDesktopGoogle({
        code: makeCode({
          email,
          name: "New User",
          allowRegistration: true,
          exp: Date.now() + 60_000,
        }),
      });

      expect(response.email).toEqual(email);
      const user = await prisma.user.findUnique({
        where: { email },
      });
      expect(user?.id).toEqual(response.userId);
      expect(user?.name).toEqual("New User");
    });

    test("normalizes the email to lowercase", async () => {
      const lower = faker.internet.email().toLowerCase();
      createdEmails.push(lower);

      const response = await anonymousTrpc.users.signInWithDesktopGoogle({
        code: makeCode({
          email: lower.toUpperCase(),
          name: "Test",
          allowRegistration: true,
          exp: Date.now() + 60_000,
        }),
      });

      expect(response.email).toEqual(lower);
    });
  });

  describe("error", () => {
    test("throws when the auth code is malformed", async () => {
      await expect(
        anonymousTrpc.users.signInWithDesktopGoogle({
          code: "not-a-valid-code",
        }),
      ).rejects.toThrow("Invalid auth code format");
    });

    test("throws when the signature is invalid", async () => {
      const code = makeCode(
        {
          email: "x@example.com",
          name: "X",
          allowRegistration: true,
          exp: Date.now() + 60_000,
        },
        "wrong-secret",
      );

      await expect(
        anonymousTrpc.users.signInWithDesktopGoogle({ code }),
      ).rejects.toThrow("Invalid auth code signature");
    });

    test("throws when the auth code has expired", async () => {
      const email = faker.internet.email().toLowerCase();

      await expect(
        anonymousTrpc.users.signInWithDesktopGoogle({
          code: makeCode({
            email,
            name: "Test",
            allowRegistration: true,
            exp: Date.now() - 1,
          }),
        }),
      ).rejects.toThrow("Auth code has expired");

      const user = await prisma.user.findUnique({
        where: { email },
      });
      expect(user).toBeNull();
    });

    test("throws NOT_FOUND and does not create a user when allowRegistration is false and the user does not exist", async () => {
      const email = faker.internet.email().toLowerCase();

      await expect(
        anonymousTrpc.users.signInWithDesktopGoogle({
          code: makeCode({
            email,
            name: "Test",
            allowRegistration: false,
            exp: Date.now() + 60_000,
          }),
        }),
      ).rejects.toThrow("An account with that email address was not found");

      const user = await prisma.user.findUnique({
        where: { email },
      });
      expect(user).toBeNull();
    });
  });
});
