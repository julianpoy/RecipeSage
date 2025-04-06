import request from "supertest";
import {
  setup,
  cleanup,
  randomString,
  randomEmail,
  createUser,
  createSession,
  secureUserMatch,
  superjsonResult,
} from "../testutils";

// DB
import Models from "../models";
const { User, Session } = Models;

describe("users", () => {
  let server;
  beforeAll(async () => {
    server = await setup();
  });

  afterAll(async () => {
    await cleanup();
  });

  describe("register", () => {
    it("success", async () => {
      const payload = {
        name: randomString(20),
        email: randomEmail(),
        password: "123456",
      };

      const { body } = await request(server)
        .post("/users/register")
        .send(payload)
        .expect(superjsonResult(200));

      const session = await Session.findOne({ where: { token: body.token } });
      expect(session).not.toBeNull();

      const user = await User.findOne({
        where: {
          id: session.userId,
          email: payload.email,
          name: payload.name,
        },
      });

      expect(user).not.toBeNull();
    });

    it("rejects invalid email", async () => {
      const payload = {
        name: randomString(20),
        email: "invalid",
        password: "123456",
      };

      await request(server)
        .post("/users/register")
        .send(payload)
        .expect(superjsonResult(412));
    });

    it("rejects short password", async () => {
      const payload = {
        name: randomString(20),
        email: randomEmail(),
        password: "short",
      };

      await request(server)
        .post("/users/register")
        .send(payload)
        .expect(superjsonResult(411));
    });

    it("rejects if email already registered", async () => {
      const user = await createUser();

      const payload = {
        name: randomString(20),
        email: user.email,
        password: "123456",
      };

      await request(server)
        .post("/users/register")
        .send(payload)
        .expect(superjsonResult(406));
    });
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

  describe("update", () => {
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

  describe("get user by-email", () => {
    it("returns user info", async () => {
      const user = await createUser();

      const { body } = await request(server)
        .get("/users/by-email")
        .query({ email: user.email })
        .expect(superjsonResult(200));

      secureUserMatch(body, user);
    });

    it("rejects non-existent email", async () => {
      const user = await createUser();

      await request(server)
        .get("/users/by-email")
        .query({ email: "a" + user.email })
        .expect(superjsonResult(404));
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
