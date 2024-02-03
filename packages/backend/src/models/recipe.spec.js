import { expect } from "chai";
import * as sinon from "sinon";

import {
  setup,
  cleanup,
  randomString,
  createUser,
  createRecipe,
} from "../testutils";

import { sequelize, Recipe } from "../models";

describe("recipe", () => {
  beforeAll(async () => {
    await setup();
  });

  afterAll(async () => {
    await cleanup();
  });

  describe("findTitle", () => {
    let _findTitleStub;

    beforeAll(() => {
      _findTitleStub = sinon
        .stub(Recipe, "_findTitle")
        .returns(Promise.resolve());
    });

    afterAll(() => {
      _findTitleStub.restore();
    });

    it("calls and returns result of _findTitle with proper args", () => {
      let userId = randomString(20);
      let recipeId = randomString(20);
      let basename = randomString(20);
      let transaction = randomString(20);

      return Recipe.findTitle(userId, recipeId, basename, transaction).then(
        () => {
          sinon.assert.calledOnce(_findTitleStub);
          let opts = _findTitleStub.getCalls()[0].args;

          expect(opts[0]).to.equal(userId);
          expect(opts[1]).to.equal(recipeId);
          expect(opts[2]).to.equal(basename);
          expect(opts[3]).to.equal(transaction);
          expect(opts[4]).to.equal(1); // recursive start idx
        },
      );
    });
  });

  describe("_findTitle", () => {
    it("returns initial name when no conflicts arise", async () => {
      let user = await createUser();

      let recipe = await createRecipe(user.id);

      return sequelize.transaction((t) => {
        return Recipe.findTitle(user.id, recipe.id, recipe.title, t).then(
          (adjustedTitle) => {
            expect(adjustedTitle).to.equal(recipe.title);
          },
        );
      });
    });

    it("returns incremented name when conflict arises", async () => {
      let user = await createUser();

      let recipe1 = await createRecipe(user.id);
      let recipe2 = await createRecipe(user.id);

      return sequelize.transaction((t) => {
        return Recipe.findTitle(user.id, recipe1.id, recipe2.title, t).then(
          (adjustedTitle) => {
            expect(adjustedTitle).to.equal(recipe2.title + " (2)");
          },
        );
      });
    });

    it("returns initial name when no conflicts arise with no recipeId", async () => {
      let user = await createUser();

      return sequelize.transaction((t) => {
        let desiredTitle = randomString(20);
        return Recipe.findTitle(user.id, null, desiredTitle, t).then(
          (adjustedTitle) => {
            expect(adjustedTitle).to.equal(desiredTitle);
          },
        );
      });
    });

    it("returns incremented name when conflict arises with no recipeId", async () => {
      let user = await createUser();

      let recipe1 = await createRecipe(user.id);

      return sequelize.transaction((t) => {
        return Recipe.findTitle(user.id, null, recipe1.title, t).then(
          (adjustedTitle) => {
            expect(adjustedTitle).to.equal(recipe1.title + " (2)");
          },
        );
      });
    });
  });

  describe("model.share", () => {
    let _shareStub;

    beforeAll(async () => {
      _shareStub = sinon
        .stub(Recipe.prototype, "share")
        .returns(Promise.resolve());
    });

    afterAll(() => {
      _shareStub.restore();
    });

    it("calls and returns result of share with proper args", async () => {
      let user1 = await createUser();
      let user2 = await createUser();
      let recipe = await createRecipe(user1.id);

      return sequelize.transaction((t) => {
        return Recipe.share(recipe.id, user2.id, t).then(() => {
          sinon.assert.calledOnce(_shareStub);
          let { args, thisValue } = _shareStub.getCalls()[0];

          expect(args[0]).to.equal(user2.id);
          expect(args[1]).to.equal(t);
          expect(thisValue.id).to.equal(recipe.id);
        });
      });
    });
  });

  describe("instance.share", () => {
    let findTitleStub;
    beforeAll(async () => {
      findTitleStub = sinon
        .stub(Recipe, "findTitle")
        .callsFake((a, b, title) => Promise.resolve(title));
    });

    afterAll(() => {
      findTitleStub.restore();
    });

    describe("shares recipe to recipient", () => {
      let user1, user2, recipe, sharedRecipe, initialCount;
      beforeAll(async () => {
        user1 = await createUser();
        user2 = await createUser();

        recipe = await createRecipe(user1.id);

        initialCount = await Recipe.count();

        await sequelize.transaction(async (t) => {
          sharedRecipe = await recipe.share(user2.id, t);
        });
      });

      it("creates a new recipe", async () => {
        expect(recipe.id).not.to.equal(sharedRecipe.id);

        return Promise.all([
          Recipe.count().then((count) =>
            expect(count).to.equal(initialCount + 1),
          ),
          Recipe.findByPk(recipe.id).then((r) => expect(r).to.not.be.null),
          Recipe.findByPk(sharedRecipe.id).then(
            (r) => expect(r).to.not.be.null,
          ),
        ]);
      });

      it("creates the recipes under the proper owners", () => {
        expect(recipe.userId).to.equal(user1.id);
        expect(sharedRecipe.userId).to.equal(user2.id);
      });

      it("includes the same data as original recipe", () => {
        expect(recipe.title).to.equal(sharedRecipe.title);
        expect(recipe.description).to.equal(sharedRecipe.description);
        expect(recipe.yield).to.equal(sharedRecipe.yield);
        expect(recipe.activeTime).to.equal(sharedRecipe.activeTime);
        expect(recipe.totalTime).to.equal(sharedRecipe.totalTime);
        expect(recipe.source).to.equal(sharedRecipe.source);
        expect(recipe.url).to.equal(sharedRecipe.url);
        expect(recipe.notes).to.equal(sharedRecipe.notes);
        expect(recipe.ingredients).to.equal(sharedRecipe.ingredients);
        expect(recipe.instructions).to.equal(sharedRecipe.instructions);
        // expect(recipe.image).to.equal(sharedRecipe.image)
      });

      it("sets the fromUserId to the sending user", () => {
        expect(sharedRecipe.fromUserId).to.equal(user1.id);
      });

      it("sets the folder to inbox on new recipe", () => {
        expect(sharedRecipe.folder).to.equal("inbox");
      });
    });
  });
});
