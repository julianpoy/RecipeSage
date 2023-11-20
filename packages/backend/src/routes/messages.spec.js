import * as request from "supertest";
import { expect } from "chai";
import * as sinon from "sinon";

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
} from "../testutils";

import * as UtilService from "../../src/services/util";

// DB
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
      dispatchStub = sinon.stub(UtilService, "dispatchMessageNotification");
    });

    afterEach(() => {
      dispatchStub.reset();
    });

    afterAll(() => {
      dispatchStub.restore();
    });

    it("succeeds with standard text message", async () => {
      const user1 = await createUser();
      const user2 = await createUser();

      const session = await createSession(user1.id);

      const payload = {
        to: user2.id,
        body: randomString(40),
      };

      return request(server)
        .post("/messages")
        .query({ token: session.token })
        .send(payload)
        .expect(201)
        .then(({ body }) =>
          Message.findByPk(body.id, {
            include: [
              {
                model: User,
                as: "toUser",
                attributes: ["id", "name", "email"],
              },
              {
                model: User,
                as: "fromUser",
                attributes: ["id", "name", "email"],
              },
            ],
          }).then((message) => {
            // Message itself
            expect(message).not.to.be.null;
            expect(message.body).to.equal(payload.body);
            // From User
            expect(message.fromUser.id).to.equal(user1.id);
            expect(message.fromUser.name).to.equal(user1.name);
            expect(message.fromUser.email).to.equal(user1.email);
            // To User
            expect(message.toUser.id).to.equal(user2.id);
            expect(message.toUser.name).to.equal(user2.name);
            expect(message.toUser.email).to.equal(user2.email);
            // Should have dispatched notification to recipient
            sinon.assert.calledOnce(dispatchStub);
          }),
        );
    });

    it("succeeds with recipe message", async () => {
      const user1 = await createUser();
      const user2 = await createUser();

      const recipe = await createRecipe(user1.id);

      const session = await createSession(user1.id);

      const payload = {
        to: user2.id,
        recipeId: recipe.id,
      };

      return request(server)
        .post("/messages")
        .query({ token: session.token })
        .send(payload)
        .expect(201)
        .then(({ body }) =>
          Message.findByPk(body.id, {
            include: [
              {
                model: User,
                as: "toUser",
                attributes: ["id", "name", "email"],
              },
              {
                model: User,
                as: "fromUser",
                attributes: ["id", "name", "email"],
              },
              {
                model: Recipe,
                as: "recipe",
                attributes: ["id", "title"],
              },
              {
                model: Recipe,
                as: "originalRecipe",
                attributes: ["id", "title"],
              },
            ],
          }).then((message) => {
            // Message itself
            expect(message).not.to.be.null;
            // From User
            expect(message.fromUser.id).to.equal(user1.id);
            expect(message.fromUser.name).to.equal(user1.name);
            expect(message.fromUser.email).to.equal(user1.email);
            // To User
            expect(message.toUser.id).to.equal(user2.id);
            expect(message.toUser.name).to.equal(user2.name);
            expect(message.toUser.email).to.equal(user2.email);

            // OriginalRecipe
            expect(message.originalRecipe.id).to.equal(recipe.id);

            // Recipe
            expect(message.recipe.id).not.to.equal(recipe.id);
            expect(message.recipe.title).to.equal(recipe.title);

            // Should have dispatched notification to recipient
            sinon.assert.calledOnce(dispatchStub);
          }),
        );
    });

    it("rejects if other user does not exist with simple message", async () => {
      const user = await createUser();

      const session = await createSession(user.id);

      const payload = {
        to: randomUuid(),
        body: randomString(40),
      };

      return request(server)
        .post("/messages")
        .query({ token: session.token })
        .send(payload)
        .expect(404);
    });

    it("rejects if other user does not exist with recipe", async () => {
      const user = await createUser();

      const recipe = await createRecipe(user.id);

      const session = await createSession(user.id);

      const payload = {
        to: randomUuid(),
        recipeId: recipe.id,
      };

      return request(server)
        .post("/messages")
        .query({ token: session.token })
        .send(payload)
        .expect(404);
    });

    it("rejects if message and recipeId are falsy", async () => {
      const user1 = await createUser();
      const user2 = await createUser();

      const session = await createSession(user1.id);

      const payload = {
        to: user2.id,
        body: "",
      };

      return request(server)
        .post("/messages")
        .query({ token: session.token })
        .send(payload)
        .expect(412);
    });

    it("requires valid token", async () => {
      const user2 = await createUser();

      const payload = {
        to: user2.id,
        body: randomString(40),
      };

      return request(server)
        .post("/messages")
        .query({ token: "invalid" })
        .send(payload)
        .expect(401);
    });
  });

  describe("fetch threads", () => {
    describe("success with standard query", () => {
      let user1, user2, user3;
      let body, message1, message2, message3, recipeOrig, recipeNew;

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

        const payload = {
          token: session.token,
        };

        body = await request(server)
          .get("/messages/threads")
          .query(payload)
          .expect(200)
          .then(({ body }) => body);
      });

      it("responds with 2 threads", () => {
        expect(body).to.have.length(2);
      });

      it("includes otherUser", () => {
        secureUserMatch(body[0].otherUser, user2);

        secureUserMatch(body[1].otherUser, user3);
      });

      it("includes messageCount", () => {
        expect(body[0].messageCount).to.equal(2);
        expect(body[1].messageCount).to.equal(1);
      });

      it("returns message arrays with correct length", () => {
        expect(body[0].messages).to.have.length(2);
        expect(body[1].messages).to.have.length(1);
      });

      it("returns message body", () => {
        expect(body[0].messages[0].body).to.equal(message1.body);
        expect(body[0].messages[1].body).to.equal(message2.body);

        expect(body[1].messages[0].body).to.equal(message3.body);
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

      it("returns originalRecipe data for recipe messages", () => {
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

        const payload = {
          token: session.token,
          light: true,
        };

        body = await request(server)
          .get("/messages/threads")
          .query(payload)
          .expect(200)
          .then(({ body }) => body);
      });

      it("responds with 2 threads", () => {
        expect(body).to.have.length(2);
      });

      it("includes otherUser", () => {
        secureUserMatch(body[0].otherUser, user2);

        secureUserMatch(body[1].otherUser, user3);
      });

      it("includes messageCount", () => {
        expect(body[0].messageCount).to.equal(2);
        expect(body[1].messageCount).to.equal(1);
      });

      it("does not include messages for threads", () => {
        expect(body[0].messages).to.be.undefined;
        expect(body[1].messages).to.be.undefined;
      });
    });

    it("returns empty array when no messages exist", async () => {
      const user = await createUser();

      const session = await createSession(user.id);

      const payload = {
        token: session.token,
      };

      await request(server)
        .get("/messages/threads")
        .query(payload)
        .expect(200)
        .then(({ body }) => expect(body).to.have.length(0));
    });

    it("requires valid session", async () => {
      await request(server).get("/messages/threads").expect(401);
    });
  });

  describe("get single thread", () => {
    describe("success with standard query", () => {
      let user1, user2, user3;
      let body, message2, recipeOrig, recipeNew;

      beforeAll(async () => {
        user1 = await createUser();
        user2 = await createUser();
        user3 = await createUser();

        // Related recipe message
        recipeOrig = await createRecipe(user2.id);
        recipeNew = await createRecipe(user1.id);
        await createMessage(user2.id, user1.id, recipeNew.id, recipeOrig.id);

        // Related text message
        message2 = await createMessage(user1.id, user2.id);

        // Unrelated message
        await createMessage(user1.id, user3.id);

        const session = await createSession(user1.id);

        const payload = {
          token: session.token,
          user: user2.id,
        };

        body = await request(server)
          .get("/messages")
          .query(payload)
          .expect(200)
          .then(({ body }) => body);
      });

      it("does not include messages from other threads", () => {
        expect(body).to.have.length(2);
      });

      it("includes message otherUser", () => {
        secureUserMatch(body[0].otherUser, user2);

        secureUserMatch(body[1].otherUser, user2);
      });

      it("includes message fromUser", () => {
        secureUserMatch(body[0].fromUser, user2);

        secureUserMatch(body[1].fromUser, user1);
      });

      it("includes message toUser", () => {
        secureUserMatch(body[0].toUser, user1);

        secureUserMatch(body[1].toUser, user2);
      });

      it("returns recipe data for recipe message", () => {
        secureRecipeMatch(body[0].recipe, recipeNew);
      });

      it("returns originalRecipe data for recipe message", () => {
        secureRecipeMatch(body[0].originalRecipe, recipeOrig);
      });

      it("returns message body for text message", () => {
        expect(body[1].body).to.equal(message2.body);
      });
    });

    it("returns empty array when no messages exist", async () => {
      const user1 = await createUser();
      const user2 = await createUser();

      const session = await createSession(user1.id);

      const payload = {
        token: session.token,
        user: user2.id,
      };

      await request(server)
        .get("/messages")
        .query(payload)
        .expect(200)
        .then(({ body }) => expect(body).to.have.length(0));
    });

    it("handles an invalid userId", async () => {
      const user = await createUser();

      const session = await createSession(user.id);

      const payload = {
        token: session.token,
        user: randomUuid(),
      };

      await request(server)
        .get("/messages")
        .query(payload)
        .expect(200)
        .then(({ body }) => expect(body).to.have.length(0));
    });

    it("handles a null userId", async () => {
      const user = await createUser();

      const session = await createSession(user.id);

      const payload = {
        token: session.token,
      };

      await request(server).get("/messages").query(payload).expect(400);
    });

    it("requires valid session", async () => {
      await request(server).get("/messages").expect(401);
    });
  });
});
