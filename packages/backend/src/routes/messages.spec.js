import request from "supertest";
import {
  setup,
  cleanup,
  randomString,
  createUser,
  createSession,
  createRecipe,
  createMessage,
  secureUserMatch,
  secureRecipeMatch,
  randomUuid,
  superjsonResult,
} from "../testutils";

import * as UtilService from "../../src/services/util";
import { Recipe, Message, User } from "../models";

describe("messages", () => {
  let server;
  beforeAll(async () => {
    server = await setup();
  });

  afterAll(async () => {
    await cleanup();
  });

  describe("create", () => {
    let dispatchStub;

    beforeAll(() => {
      dispatchStub = vi
        .spyOn(UtilService, "dispatchMessageNotification")
        .mockImplementation(() => {
          // noop
        });
    });

    afterEach(() => {
      dispatchStub.mockReset();
    });

    afterAll(() => {
      dispatchStub.mockRestore();
    });

    it("succeeds with standard text message", async () => {
      const user1 = await createUser();
      const user2 = await createUser();
      const session = await createSession(user1.id);
      const payload = { to: user2.id, body: randomString(40) };

      const { body } = await request(server)
        .post("/messages")
        .query({ token: session.token })
        .send(payload)
        .expect(superjsonResult(201));

      const message = await Message.findByPk(body.id, {
        include: [
          { model: User, as: "toUser", attributes: ["id", "name", "email"] },
          { model: User, as: "fromUser", attributes: ["id", "name", "email"] },
        ],
      });

      expect(message).not.toBeNull();
      expect(message.body).toBe(payload.body);
      expect(message.fromUser.id).toBe(user1.id);
      expect(message.toUser.id).toBe(user2.id);
      expect(dispatchStub).toHaveBeenCalledTimes(1);
    });

    it("succeeds with recipe message", async () => {
      const user1 = await createUser();
      const user2 = await createUser();
      const recipe = await createRecipe(user1.id);
      const session = await createSession(user1.id);
      const payload = { to: user2.id, recipeId: recipe.id };

      const { body } = await request(server)
        .post("/messages")
        .query({ token: session.token })
        .send(payload)
        .expect(superjsonResult(201));

      const message = await Message.findByPk(body.id, {
        include: [
          { model: User, as: "toUser", attributes: ["id", "name", "email"] },
          { model: User, as: "fromUser", attributes: ["id", "name", "email"] },
          { model: Recipe, as: "recipe", attributes: ["id", "title"] },
          { model: Recipe, as: "originalRecipe", attributes: ["id", "title"] },
        ],
      });

      expect(message).not.toBeNull();
      expect(message.fromUser.id).toBe(user1.id);
      expect(message.toUser.id).toBe(user2.id);
      expect(message.originalRecipe.id).toBe(recipe.id);
      expect(message.recipe.id).not.toBe(recipe.id);
      expect(message.recipe.title).toBe(recipe.title);
      expect(dispatchStub).toHaveBeenCalledTimes(1);
    });

    it("rejects if other user does not exist (simple message)", async () => {
      const user = await createUser();
      const session = await createSession(user.id);

      await request(server)
        .post("/messages")
        .query({ token: session.token })
        .send({ to: randomUuid(), body: randomString(40) })
        .expect(superjsonResult(404));
    });

    it("rejects if other user does not exist (recipe message)", async () => {
      const user = await createUser();
      const recipe = await createRecipe(user.id);
      const session = await createSession(user.id);

      await request(server)
        .post("/messages")
        .query({ token: session.token })
        .send({ to: randomUuid(), recipeId: recipe.id })
        .expect(superjsonResult(404));
    });

    it("rejects if both message and recipeId are falsy", async () => {
      const user1 = await createUser();
      const user2 = await createUser();
      const session = await createSession(user1.id);

      await request(server)
        .post("/messages")
        .query({ token: session.token })
        .send({ to: user2.id, body: "" })
        .expect(superjsonResult(412));
    });

    it("requires valid token", async () => {
      const user2 = await createUser();

      await request(server)
        .post("/messages")
        .query({ token: "invalid" })
        .send({ to: user2.id, body: randomString(40) })
        .expect(superjsonResult(401));
    });
  });

  describe("fetch threads", () => {
    describe("success with standard query", () => {
      let user1, user2, user3;
      let message1, message2, message3;
      let recipeOrig, recipeNew;
      let body;

      beforeAll(async () => {
        user1 = await createUser();
        user2 = await createUser();
        user3 = await createUser();

        message1 = await createMessage(user1.id, user2.id);
        message2 = await createMessage(user2.id, user1.id);

        recipeOrig = await createRecipe(user1.id);
        recipeNew = await createRecipe(user3.id);
        message3 = await createMessage(
          user1.id,
          user3.id,
          recipeNew.id,
          recipeOrig.id,
        );

        const session = await createSession(user1.id);
        const res = await request(server)
          .get("/messages/threads")
          .query({ token: session.token })
          .expect(superjsonResult(200));

        body = res.body;
      });

      it("responds with 2 threads", () => {
        expect(body).toHaveLength(2);
      });

      it("includes otherUser", () => {
        secureUserMatch(body[0].otherUser, user2);
        secureUserMatch(body[1].otherUser, user3);
      });

      it("includes messageCount", () => {
        expect(body[0].messageCount).toBe(2);
        expect(body[1].messageCount).toBe(1);
      });

      it("returns message arrays with correct length", () => {
        expect(body[0].messages).toHaveLength(2);
        expect(body[1].messages).toHaveLength(1);
      });

      it("returns message body", () => {
        expect(body[0].messages[0].body).toBe(message1.body);
        expect(body[0].messages[1].body).toBe(message2.body);
        expect(body[1].messages[0].body).toBe(message3.body);
      });

      it("returns message fromUser", () => {
        secureUserMatch(body[0].messages[0].fromUser, user1);
        secureUserMatch(body[0].messages[1].fromUser, user2);
        secureUserMatch(body[1].messages[0].fromUser, user1);
      });

      it("returns message toUser", () => {
        secureUserMatch(body[0].messages[0].toUser, user2);
        secureUserMatch(body[0].messages[1].toUser, user1);
        secureUserMatch(body[1].messages[0].toUser, user3);
      });

      it("returns recipe data for recipe messages", () => {
        secureRecipeMatch(body[1].messages[0].recipe, recipeNew);
      });

      it("returns originalRecipe data", () => {
        secureRecipeMatch(body[1].messages[0].originalRecipe, recipeOrig);
      });
    });

    describe("success with light query", () => {
      let user1, user2, user3, body;

      beforeAll(async () => {
        user1 = await createUser();
        user2 = await createUser();
        user3 = await createUser();

        await createMessage(user1.id, user2.id);
        await createMessage(user1.id, user2.id);
        await createMessage(user1.id, user3.id);

        const session = await createSession(user1.id);

        const res = await request(server)
          .get("/messages/threads")
          .query({ token: session.token, light: true })
          .expect(superjsonResult(200));

        body = res.body;
      });

      it("responds with 2 threads", () => {
        expect(body).toHaveLength(2);
      });

      it("includes otherUser", () => {
        secureUserMatch(body[0].otherUser, user2);
        secureUserMatch(body[1].otherUser, user3);
      });

      it("includes messageCount", () => {
        expect(body[0].messageCount).toBe(2);
        expect(body[1].messageCount).toBe(1);
      });

      it("does not include messages", () => {
        expect(body[0].messages).toBeUndefined();
        expect(body[1].messages).toBeUndefined();
      });
    });

    it("returns empty array when no messages exist", async () => {
      const user = await createUser();
      const session = await createSession(user.id);

      const res = await request(server)
        .get("/messages/threads")
        .query({ token: session.token })
        .expect(superjsonResult(200));

      expect(res.body).toHaveLength(0);
    });

    it("requires valid session", async () => {
      await request(server)
        .get("/messages/threads")
        .expect(superjsonResult(401));
    });
  });

  describe("get single thread", () => {
    describe("success with standard query", () => {
      let user1, user2, user3;
      let message2, recipeOrig, recipeNew;
      let body;

      beforeAll(async () => {
        user1 = await createUser();
        user2 = await createUser();
        user3 = await createUser();

        recipeOrig = await createRecipe(user2.id);
        recipeNew = await createRecipe(user1.id);
        await createMessage(user2.id, user1.id, recipeNew.id, recipeOrig.id);

        message2 = await createMessage(user1.id, user2.id);

        await createMessage(user1.id, user3.id);

        const session = await createSession(user1.id);

        const res = await request(server)
          .get("/messages")
          .query({ token: session.token, user: user2.id })
          .expect(superjsonResult(200));

        body = res.body;
      });

      it("does not include messages from other threads", () => {
        expect(body).toHaveLength(2);
      });

      it("includes message otherUser", () => {
        body.forEach((msg) => secureUserMatch(msg.otherUser, user2));
      });

      it("includes message fromUser", () => {
        secureUserMatch(body[0].fromUser, user2);
        secureUserMatch(body[1].fromUser, user1);
      });

      it("includes message toUser", () => {
        secureUserMatch(body[0].toUser, user1);
        secureUserMatch(body[1].toUser, user2);
      });

      it("returns recipe data", () => {
        secureRecipeMatch(body[0].recipe, recipeNew);
      });

      it("returns originalRecipe data", () => {
        secureRecipeMatch(body[0].originalRecipe, recipeOrig);
      });

      it("returns message body", () => {
        expect(body[1].body).toBe(message2.body);
      });
    });

    it("returns empty array when no messages exist", async () => {
      const user1 = await createUser();
      const user2 = await createUser();
      const session = await createSession(user1.id);

      const res = await request(server)
        .get("/messages")
        .query({ token: session.token, user: user2.id })
        .expect(superjsonResult(200));

      expect(res.body).toHaveLength(0);
    });

    it("handles an invalid userId", async () => {
      const user = await createUser();
      const session = await createSession(user.id);

      const res = await request(server)
        .get("/messages")
        .query({ token: session.token, user: randomUuid() })
        .expect(superjsonResult(200));

      expect(res.body).toHaveLength(0);
    });

    it("handles a null userId", async () => {
      const user = await createUser();
      const session = await createSession(user.id);

      await request(server)
        .get("/messages")
        .query({ token: session.token })
        .expect(superjsonResult(400));
    });

    it("requires valid session", async () => {
      await request(server).get("/messages").expect(superjsonResult(401));
    });
  });
});
