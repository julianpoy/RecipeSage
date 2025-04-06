import request from "supertest";

import {
  setup,
  cleanup,
  randomString,
  createUser,
  createSession,
  createRecipe,
  createLabel,
  associateLabel,
  randomUuid,
  superjsonResult,
} from "../testutils";

// DB
import Models from "../models";
const { Recipe, Label } = Models;

describe("labels", () => {
  let server;
  beforeAll(async () => {
    server = await setup();
  });

  afterAll(async () => {
    await cleanup();
  });

  describe("create", () => {
    it("succeeds with valid data", async () => {
      const user = await createUser();
      const session = await createSession(user.id);
      const recipe = await createRecipe(user.id);

      const payload = {
        title: randomString(20),
        recipeId: recipe.id,
      };

      const { body } = await request(server)
        .post("/labels")
        .query({ token: session.token })
        .send(payload)
        .expect(superjsonResult(201));

      const label = await Label.findByPk(body.id, {
        include: [
          {
            model: Recipe,
            as: "recipes",
            attributes: ["id"],
          },
        ],
      });

      expect(label).not.toBeNull();
      expect(label.title).toBe(payload.title);
      expect(label.recipes.length).toBe(1);
      expect(label.recipes[0].id).toBe(payload.recipeId);
    });

    it("rejects if no title is present", async () => {
      const user = await createUser();
      const session = await createSession(user.id);
      const recipe = await createRecipe(user.id);

      const payload = {
        title: "",
        recipeId: recipe.id,
      };

      await request(server)
        .post("/labels")
        .query({ token: session.token })
        .send(payload)
        .expect(superjsonResult(412));
    });

    it("rejects if no recipeId is present", async () => {
      const user = await createUser();
      const session = await createSession(user.id);

      const payload = {
        title: randomString(20),
      };

      await request(server)
        .post("/labels")
        .query({ token: session.token })
        .send(payload)
        .expect(superjsonResult(412));
    });

    it("rejects if recipeId is empty", async () => {
      const user = await createUser();
      const session = await createSession(user.id);

      const payload = {
        title: randomString(20),
        recipeId: "",
      };

      await request(server)
        .post("/labels")
        .query({ token: session.token })
        .send(payload)
        .expect(superjsonResult(412));
    });

    it("rejects if recipeId is invalid", async () => {
      const user = await createUser();
      const session = await createSession(user.id);

      const payload = {
        title: randomString(20),
        recipeId: "invalid",
      };

      const initialCount = await Label.count();

      await request(server)
        .post("/labels")
        .query({ token: session.token })
        .send(payload)
        .expect(superjsonResult(500));

      const count = await Label.count();
      expect(count).toBe(initialCount);
    });

    it("requires valid session", async () => {
      const user = await createUser();
      const recipe = await createRecipe(user.id);

      const payload = {
        title: randomString(20),
        recipeId: recipe.id,
      };

      await request(server)
        .post("/labels")
        .query({ token: "invalid" })
        .send(payload)
        .expect(superjsonResult(401));
    });
  });

  describe("get listing", () => {
    describe("succeeds with valid data", () => {
      let user1, recipe1, label1, session;
      let user2, recipe2, label2;
      let responseBody;

      beforeAll(async () => {
        user1 = await createUser();
        recipe1 = await createRecipe(user1.id);
        label1 = await createLabel(user1.id);
        await associateLabel(label1.id, recipe1.id);
        session = await createSession(user1.id);

        user2 = await createUser();
        recipe2 = await createRecipe(user2.id);
        label2 = await createLabel(user2.id);
        await associateLabel(label2.id, recipe2.id);

        const res = await request(server)
          .get("/labels")
          .query({ token: session.token })
          .expect(superjsonResult(200));

        responseBody = res.body;
      });

      it("responds with an array", () => {
        expect(Array.isArray(responseBody)).toBe(true);
      });

      it("responds with user's labels", () => {
        expect(responseBody[0].id).toBe(label1.id);
        expect(responseBody[0].title).toBe(label1.title);
      });

      it("does not contain other user's labels", () => {
        expect(responseBody.length).toBe(1);
      });

      it("responds with associated recipes", () => {
        expect(responseBody[0].recipeCount).toBe("1");
      });
    });

    it("requires valid session", async () => {
      await request(server)
        .get("/labels")
        .query({ token: "invalid" })
        .expect(superjsonResult(401));
    });
  });

  describe("delete", () => {
    it("succeeds when label has more than one recipe", async () => {
      const user = await createUser();
      const recipe1 = await createRecipe(user.id);
      const recipe2 = await createRecipe(user.id);
      const label = await createLabel(user.id);

      await associateLabel(label.id, recipe1.id);
      await associateLabel(label.id, recipe2.id);
      const session = await createSession(user.id);

      const payload = {
        token: session.token,
        labelId: label.id,
        recipeId: recipe1.id,
      };

      await request(server)
        .delete("/labels")
        .query(payload)
        .expect(superjsonResult(200));

      const updatedLabel = await Label.findByPk(label.id, {
        include: [
          {
            model: Recipe,
            as: "recipes",
            attributes: ["id"],
          },
        ],
      });

      expect(updatedLabel.recipes.length).toBe(1);
      expect(updatedLabel.recipes[0].id).toBe(recipe2.id);
    });

    it("succeeds when label has only one recipe", async () => {
      const user = await createUser();
      const recipe = await createRecipe(user.id);
      const label = await createLabel(user.id);

      await associateLabel(label.id, recipe.id);
      const session = await createSession(user.id);

      const payload = {
        token: session.token,
        labelId: label.id,
        recipeId: recipe.id,
      };

      await request(server)
        .delete("/labels")
        .query(payload)
        .expect(superjsonResult(200));

      const updatedLabel = await Label.findByPk(label.id, {
        include: [
          {
            model: Recipe,
            as: "recipes",
            attributes: ["id"],
          },
        ],
      });

      expect(updatedLabel.recipes.length).toBe(0);
    });

    it("rejects if user does not own recipe", async () => {
      const user1 = await createUser();
      const user2 = await createUser();
      const recipe = await createRecipe(user2.id);
      const label = await createLabel(user2.id);

      await associateLabel(label.id, recipe.id);

      const session = await createSession(user1.id);

      const payload = {
        token: session.token,
        labelId: label.id,
        recipeId: recipe.id,
      };

      await request(server)
        .delete("/labels")
        .query(payload)
        .expect(superjsonResult(404));
    });

    it("rejects if recipe does not exist", async () => {
      const user = await createUser();
      const recipe = await createRecipe(user.id);
      const label = await createLabel(user.id);

      await associateLabel(label.id, recipe.id);
      const session = await createSession(user.id);

      const payload = {
        token: session.token,
        labelId: label.id,
        recipeId: "invalid",
      };

      await request(server)
        .delete("/labels")
        .query(payload)
        .expect(superjsonResult(404));
    });

    it("rejects if label does not exist", async () => {
      const user = await createUser();
      const recipe = await createRecipe(user.id);
      const label = await createLabel(user.id);

      await associateLabel(label.id, recipe.id);
      const session = await createSession(user.id);

      const payload = {
        token: session.token,
        labelId: randomUuid(),
        recipeId: recipe.id,
      };

      await request(server)
        .delete("/labels")
        .query(payload)
        .expect(superjsonResult(404));
    });

    it("rejects if recipeid is falsy", async () => {
      const user = await createUser();
      const recipe = await createRecipe(user.id);
      const label = await createLabel(user.id);

      await associateLabel(label.id, recipe.id);
      const session = await createSession(user.id);

      const payload = {
        token: session.token,
        labelId: label.id,
        recipeId: "",
      };

      await request(server)
        .delete("/labels")
        .query(payload)
        .expect(superjsonResult(412));
    });

    it("rejects if labelid is falsy", async () => {
      const user = await createUser();
      const recipe = await createRecipe(user.id);
      const label = await createLabel(user.id);

      await associateLabel(label.id, recipe.id);
      const session = await createSession(user.id);

      const payload = {
        token: session.token,
        labelId: "",
        recipeId: recipe.id,
      };

      await request(server)
        .delete("/labels")
        .query(payload)
        .expect(superjsonResult(412));
    });

    it("requires valid session", async () => {
      const user = await createUser();
      const recipe = await createRecipe(user.id);
      const label = await createLabel(user.id);

      await associateLabel(label.id, recipe.id);

      const payload = {
        token: "invalid",
        labelId: label.id,
        recipeId: recipe.id,
      };

      await request(server)
        .delete("/labels")
        .query(payload)
        .expect(superjsonResult(401));
    });
  });
});
