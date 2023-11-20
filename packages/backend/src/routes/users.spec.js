import * as request from "supertest";
import { expect } from "chai";

import {
  setup,
  cleanup,
  randomString,
  randomEmail,
  createUser,
  createSession,
  secureUserMatch,
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

      return request(server)
        .post("/users/register")
        .send(payload)
        .expect(200)
        .then(({ body }) =>
          Session.findOne({
            where: {
              token: body.token,
            },
          }).then((session) => {
            expect(session).not.to.be.null;

            return User.findOne({
              where: {
                id: session.userId,
                email: payload.email,
                name: payload.name,
              },
            }).then((user) => {
              expect(user).not.to.be.null;
            });
          }),
        );
    });

    it("rejects invalid email", async () => {
      const payload = {
        name: randomString(20),
        email: "invalid",
        password: "123456",
      };

      return request(server).post("/users/register").send(payload).expect(412);
    });

    it("rejects short password", async () => {
      const payload = {
        name: randomString(20),
        email: randomEmail(),
        password: "short",
      };

      return request(server).post("/users/register").send(payload).expect(411);
    });

    it("rejects if email already registered", async () => {
      const user = await createUser();

      const payload = {
        name: randomString(20),
        email: user.email,
        password: "123456",
      };

      return request(server).post("/users/register").send(payload).expect(406);
    });
  });

  describe("login", () => {
    it("success", async () => {
      const user = await createUser();

      const payload = {
        email: user.email,
        password: "123456",
      };

      return request(server)
        .post("/users/login")
        .send(payload)
        .expect(200)
        .then(({ body }) =>
          Session.findOne({
            where: {
              userId: user.id,
              token: body.token,
            },
          }).then((session) => {
            expect(session).not.to.be.null;
          }),
        );
    });

    it("rejects incorrect email", async () => {
      await createUser();

      const payload = {
        email: "incorrect@gmail.com",
        password: "123456",
      };

      return request(server).post("/users/login").send(payload).expect(412);
    });

    it("rejects incorrect password", async () => {
      const user = await createUser();

      const payload = {
        email: user.email,
        password: "incorrect",
      };

      return request(server).post("/users/login").send(payload).expect(412);
    });
  });

  describe("update", () => {
    it("success", async () => {
      const user = await createUser();

      const payload = {
        email: user.email,
        password: "123456",
      };

      return request(server)
        .post("/users/login")
        .send(payload)
        .expect(200)
        .then(({ body }) =>
          Session.findOne({
            where: {
              userId: user.id,
              token: body.token,
            },
          }).then((session) => {
            expect(session).not.to.be.null;
          }),
        );
    });

    it("rejects incorrect email", async () => {
      await createUser();

      const payload = {
        email: "incorrect@gmail.com",
        password: "123456",
      };

      return request(server).post("/users/login").send(payload).expect(412);
    });

    it("rejects incorrect password", async () => {
      const user = await createUser();

      const payload = {
        email: user.email,
        password: "incorrect",
      };

      return request(server).post("/users/login").send(payload).expect(412);
    });
  });

  describe("get user by-email", () => {
    it("returns user info", async () => {
      const user = await createUser();

      return request(server)
        .get("/users/by-email")
        .query({ email: user.email })
        .expect(200)
        .then(({ body }) => secureUserMatch(body, user));
    });

    it("rejects non-existent email", async () => {
      const user = await createUser();

      return request(server)
        .get("/users/by-email")
        .query({ email: "a" + user.email })
        .expect(404);
    });
  });

  describe("user self", () => {
    it("returns user info", async () => {
      const user = await createUser();

      const session = await createSession(user.id);

      return request(server)
        .get("/users/")
        .query({ token: session.token })
        .expect(200)
        .then(({ body }) => {
          expect(body.id).to.equal(user.id);
          expect(body.name).to.equal(user.name);
          expect(body.email).to.equal(user.email);
          expect(new Date(body.createdAt).getTime()).to.equal(
            new Date(user.createdAt).getTime(),
          );
          expect(new Date(body.updatedAt).getTime()).to.equal(
            new Date(user.updatedAt).getTime(),
          );
        });
    });
  });

  describe("sessioncheck", () => {
    it("accepts valid session", async () => {
      const user = await createUser();

      const session = await createSession(user.id);

      return request(server)
        .get("/users/sessioncheck")
        .query({ token: session.token })
        .expect(200);
    });

    it("denies invalid session", async () => {
      return request(server)
        .get("/users/sessioncheck")
        .query({ token: "invalid" })
        .expect(401);
    });
  });
});
