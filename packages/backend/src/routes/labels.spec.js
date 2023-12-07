import * as request from "supertest";
import { expect } from "chai";

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
} from "../testutils";

// DB
import * as Models from "../models";
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

      return request(server)
        .post("/labels")
        .query({ token: session.token })
        .send(payload)
        .expect(201)
        .then(({ body }) =>
          Label.findByPk(body.id, {
            include: [
              {
                model: Recipe,
                as: "recipes",
                attributes: ["id"],
              },
            ],
          }).then((label) => {
            expect(label).not.to.be.null;
            expect(label.title).to.equal(payload.title);
            expect(label.recipes.length).to.equal(1);
            expect(label.recipes[0].id).to.equal(payload.recipeId);
          }),
        );
    });

    it("rejects if no title is present", async () => {
      const user = await createUser();

      const session = await createSession(user.id);

      const recipe = await createRecipe(user.id);

      const payload = {
        title: "",
        recipeId: recipe.id,
      };

      return request(server)
        .post("/labels")
        .query({ token: session.token })
        .send(payload)
        .expect(412);
    });

    it("rejects if no recipeId is present", async () => {
      const user = await createUser();

      const session = await createSession(user.id);

      const payload = {
        title: randomString(20),
      };

      return request(server)
        .post("/labels")
        .query({ token: session.token })
        .send(payload)
        .expect(412);
    });

    it("rejects if recipeId is empty", async () => {
      const user = await createUser();

      const session = await createSession(user.id);

      const payload = {
        title: randomString(20),
        recipeId: "",
      };

      return request(server)
        .post("/labels")
        .query({ token: session.token })
        .send(payload)
        .expect(412);
    });

    it("rejects if recipeId is invalid", async () => {
      const user = await createUser();

      const session = await createSession(user.id);

      const payload = {
        title: randomString(20),
        recipeId: "invalid",
      };

      const intialCount = await Label.count();

      return request(server)
        .post("/labels")
        .query({ token: session.token })
        .send(payload)
        .expect(500)
        .then(async () => {
          const count = await Label.count();
          expect(count).to.equal(intialCount);
        });
    });

    it("requires valid session", async () => {
      const user = await createUser();

      const recipe = await createRecipe(user.id);

      const payload = {
        title: randomString(20),
        recipeId: recipe.id,
      };

      return request(server)
        .post("/labels")
        .query({ token: "invalid" })
        .send(payload)
        .expect(401);
    });
  });

  describe("get listing", () => {
    describe("succeeds with valid data", () => {
      let user1;
      let recipe1;
      let label1;
      let session;

      let user2;
      let recipe2;
      let label2;

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

        responseBody = await request(server)
          .get("/labels")
          .query({ token: session.token })
          .expect(200)
          .then(({ body }) => {
            return body;
          });
      });

      it("responds with an array", () => {
        expect(responseBody).to.be.an("array");
      });

      it("responds with user's labels", () => {
        expect(responseBody[0].id).to.equal(label1.id);
        expect(responseBody[0].title).to.equal(label1.title);
      });

      it("does not contain other user's labels", () => {
        expect(responseBody.length).to.equal(1);
      });

      it("responds with associated recipes", () => {
        expect(responseBody[0].recipeCount).to.equal("1");
      });
    });

    it("requires valid session", async () => {
      return request(server)
        .get("/labels")
        .query({ token: "invalid" })
        .expect(401);
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

      return request(server)
        .delete("/labels")
        .query(payload)
        .expect(200)
        .then(() => {
          Label.findByPk(label.id, {
            include: [
              {
                model: Recipe,
                as: "recipes",
                attributes: ["id"],
              },
            ],
          }).then((label) => {
            // Has removed the recipe
            expect(label.recipes.length).to.equal(1);
            expect(label.recipes[0].id).to.equal(recipe2.id);
          });
        });
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

      return request(server)
        .delete("/labels")
        .query(payload)
        .expect(200)
        .then(() => {
          // Does not remove the label anymore (should be done via label management)
          Label.findByPk(label.id, {
            include: [
              {
                model: Recipe,
                as: "recipes",
                attributes: ["id"],
              },
            ],
          }).then((label) => {
            // Has removed the recipe
            expect(label.recipes.length).to.equal(0);
          });
        });
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

      return request(server).delete("/labels").query(payload).expect(404);
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

      return request(server).delete("/labels").query(payload).expect(404);
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

      return request(server).delete("/labels").query(payload).expect(404);
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

      return request(server).delete("/labels").query(payload).expect(412);
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

      return request(server).delete("/labels").query(payload).expect(412);
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

      return request(server).delete("/labels").query(payload).expect(401);
    });
  });
});
