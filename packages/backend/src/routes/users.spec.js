import request from "supertest";
import {
  setup,
  cleanup,
  createUser,
  createSession,
  superjsonResult,
} from "../testutils";

// DB
import Models from "../models";
const { Session } = Models;

describe("users", () => {
  let server;
  beforeAll(async () => {
    server = await setup();
  });

  afterAll(async () => {
    await cleanup();
  });

  describe("login", () => {
    it("success", async () => {
      const user = await createUser();

      const payload = {
        email: user.email,
        password: "123456",
      };

      const { body } = await request(server)
        .post("/users/login")
        .send(payload)
        .expect(superjsonResult(200));

      const session = await Session.findOne({
        where: { userId: user.id, token: body.token },
      });

      expect(session).not.toBeNull();
    });

    it("rejects incorrect email", async () => {
      await createUser();

      const payload = {
        email: "incorrect@gmail.com",
        password: "123456",
      };

      await request(server)
        .post("/users/login")
        .send(payload)
        .expect(superjsonResult(412));
    });

    it("rejects incorrect password", async () => {
      const user = await createUser();

      const payload = {
        email: user.email,
        password: "incorrect",
      };

      await request(server)
        .post("/users/login")
        .send(payload)
        .expect(superjsonResult(412));
    });
  });

  describe("user self", () => {
    it("returns user info", async () => {
      const user = await createUser();
      const session = await createSession(user.id);

      const { body } = await request(server)
        .get("/users/")
        .query({ token: session.token })
        .expect(superjsonResult(200));

      expect(body.id).toBe(user.id);
      expect(body.name).toBe(user.name);
      expect(body.email).toBe(user.email);
      expect(new Date(body.createdAt).getTime()).toBe(
        new Date(user.createdAt).getTime(),
      );
      expect(new Date(body.updatedAt).getTime()).toBe(
        new Date(user.updatedAt).getTime(),
      );
    });
  });

  describe("sessioncheck", () => {
    it("accepts valid session", async () => {
      const user = await createUser();
      const session = await createSession(user.id);

      await request(server)
        .get("/users/sessioncheck")
        .query({ token: session.token })
        .expect(superjsonResult(200));
    });

    it("denies invalid session", async () => {
      await request(server)
        .get("/users/sessioncheck")
        .query({ token: "invalid" })
        .expect(superjsonResult(401));
    });
  });
});
