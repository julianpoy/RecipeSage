let request = require('supertest');
let {
  expect
} = require('chai');

let {
  setup,
  cleanup,
  syncDB,
  randomString,
  randomEmail,
  createUser,
  createSession,
  createRecipe,
  createLabel,
  associateLabel
} = require('../testutils');

// DB
var Op = require("sequelize").Op;
var SQ = require('../models').sequelize;
var User = require('../models').User;
var FCMToken = require('../models').FCMToken;
var Session = require('../models').Session;
var Recipe = require('../models').Recipe;
var Label = require('../models').Label;

describe('recipes', () => {
  var server;
  before(async () => {
    server = await setup();
  });

  beforeEach(async () => {
    await syncDB();
  });

  after(async () => {
    await cleanup(server);
  });

  describe('create', () => {
    it('succeeds for personal recipe with valid payload, no image', async () => {
      let user = await createUser();

      let session = await createSession(user.id);

      let payload = {
        title: randomString(20),
        description: randomString(20),
        yield: randomString(20),
        activeTime: randomString(20),
        totalTime: randomString(20),
        source: randomString(20),
        url: randomString(20),
        notes: randomString(20),
        ingredients: randomString(20),
        instructions: randomString(20)
      };

      return request(server)
        .post('/recipes')
        .query({ token: session.token })
        .send(payload)
        .expect(201)
        .then(({ body }) =>
          Recipe.find({
            where: {
              [Op.and]: [payload, { id: body.id, userId: user.id }]
            }
          }).then(recipe => {
            expect(recipe).not.to.be.null
          }).then(() => {
            Recipe.count().then(count => {
              expect(count).to.equal(1)
            })
          })
        );
    });

    it('allows null fields', async () => {
      let user = await createUser();

      let session = await createSession(user.id);

      let payload = {
        title: randomString(20)
      };

      return request(server)
        .post('/recipes')
        .query({ token: session.token })
        .send(payload)
        .expect(201)
        .then(({ body }) =>
          Recipe.find({
            where: {
              [Op.and]: [payload, { id: body.id, userId: user.id }]
            }
          }).then(recipe => {
            expect(recipe).not.to.be.null
          }).then(() => {
            Recipe.count().then(count => {
              expect(count).to.equal(1)
            })
          })
        );
    });

    it('rejects if no title is present', async () => {
      let user = await createUser();

      let session = await createSession(user.id);

      let payload = {
        description: randomString(20),
        yield: randomString(20),
        activeTime: randomString(20),
        totalTime: randomString(20),
        source: randomString(20),
        url: randomString(20),
        notes: randomString(20),
        ingredients: randomString(20),
        instructions: randomString(20)
      };

      return request(server)
        .post('/recipes')
        .query({ token: session.token })
        .send(payload)
        .expect(412)
        .then(() =>
          Recipe.count().then(count => {
            expect(count).to.equal(0)
          })
        );
    });

    it('rejects if title is an empty string', async () => {
      let user = await createUser();

      let session = await createSession(user.id);

      let payload = {
        title: '',
        description: randomString(20),
        yield: randomString(20),
        activeTime: randomString(20),
        totalTime: randomString(20),
        source: randomString(20),
        url: randomString(20),
        notes: randomString(20),
        ingredients: randomString(20),
        instructions: randomString(20)
      };

      return request(server)
        .post('/recipes')
        .query({ token: session.token })
        .send(payload)
        .expect(412)
        .then(() =>
          Recipe.count().then(count => {
            expect(count).to.equal(0)
          })
        );
    });

    it('rejects invalid token', async () => {
      let payload = {
        title: randomString(20),
        description: randomString(20),
        yield: randomString(20),
        activeTime: randomString(20),
        totalTime: randomString(20),
        source: randomString(20),
        url: randomString(20),
        notes: randomString(20),
        ingredients: randomString(20),
        instructions: randomString(20)
      };

      return request(server)
        .post('/recipes')
        .send(payload)
        .query({ token: 'invalid' })
        .expect(401)
        .then(() =>
          Recipe.count().then(count => {
            expect(count).to.equal(0)
          })
        );
    });
  });

  describe('get listing', () => {
    it('returns recipes for main folder', async () => {
      let user = await createUser();

      let session = await createSession(user.id);

      await createRecipe(user.id);
      await createRecipe(user.id);
      await createRecipe(user.id, 'inbox');

      let payload = {
        token: session.token,
        folder: 'main'
      }

      return request(server)
        .get('/recipes')
        .query(payload)
        .expect(200)
        .then(({ body }) =>
          expect(body.length).to.equal(2)
        );
    });

    it('returns recipes for inbox folder', async () => {
      let user = await createUser();

      let session = await createSession(user.id);

      await createRecipe(user.id);
      await createRecipe(user.id);
      await createRecipe(user.id, 'inbox');

      let payload = {
        token: session.token,
        folder: 'inbox'
      }

      return request(server)
        .get('/recipes')
        .query(payload)
        .expect(200)
        .then(({ body }) =>
          expect(body.length).to.equal(1)
        );
    });

    it('does not return recipes for another user', async () => {
      let user1 = await createUser();
      let user2 = await createUser();

      let session = await createSession(user1.id);

      await createRecipe(user2.id);
      await createRecipe(user2.id);

      return request(server)
        .get('/recipes')
        .query({ token: session.token })
        .expect(200)
        .then(({ body }) =>
          expect(body.length).to.equal(0)
        );
    });

    it('returns associated labels', async () => {
      let user = await createUser();

      let session = await createSession(user.id);

      let recipe = await createRecipe(user.id);

      let label1 = await createLabel(user.id);
      let label2 = await createLabel(user.id);

      await associateLabel(label1.id, recipe.id)
      await associateLabel(label2.id, recipe.id)

      let payload = {
        token: session.token,
        folder: 'main'
      }

      return request(server)
        .get('/recipes')
        .query(payload)
        .expect(200)
        .then(({ body }) =>
          expect(body[0].labels.length).to.equal(2)
        );
    });

    it('returns fromUser', async () => {
      let user1 = await createUser();
      let user2 = await createUser();

      let session = await createSession(user1.id);

      await createRecipe(user1.id, null, user2.id);

      let payload = {
        token: session.token,
        folder: 'main'
      }

      return request(server)
        .get('/recipes')
        .query(payload)
        .expect(200)
        .then(({ body }) => {
          expect(body[0].fromUser.name).to.equal(user2.name)
          expect(body[0].fromUser.email).to.equal(user2.email)
          expect(Object.keys(body[0].fromUser).length).to.equal(2) // Protect user privacy
        });
    });

    it('rejects invalid token', async () => {
      return request(server)
        .get('/recipes')
        .query({ token: 'invalid' })
        .expect(401);
    });
  })

  describe('get single', () => {
    it('returns recipe', async () => {
      let user = await createUser();

      let session = await createSession(user.id);

      let recipe = await createRecipe(user.id);

      let label = await createLabel(user.id);

      await associateLabel(label.id, recipe.id);

      return request(server)
        .get(`/recipes/${recipe.id}`)
        .query({ token: session.token })
        .expect(200)
        .then(({ body }) => {
          expect(body.id).to.equal(recipe.id)
          expect(body.title).to.equal(recipe.title)
          expect(body.labels.length).to.equal(1)
        });
    });

    it('rejects invalid recipeId', async () => {
      let user = await createUser();

      let session = await createSession(user.id);

      await createRecipe(user.id);

      return request(server)
        .get('/recipes/invalid')
        .query({ token: session.token })
        .expect(404);
    });

    it('does not return recipe belonging to another user', async () => {
      let user1 = await createUser();
      let user2 = await createUser();

      let session = await createSession(user1.id);

      let recipe = await createRecipe(user2.id);

      return request(server)
        .get(`/recipes/${recipe.id}`)
        .query({ token: session.token })
        .expect(404);
    });

    it('requires valid session', async () => {
      let user = await createUser();

      let session = await createSession(user.id);

      let recipe = await createRecipe(user.id);

      return request(server)
        .get(`/recipes/${recipe.id}`)
        .query({ token: 'invalid' })
        .expect(401);
    });
  })

  describe('update', () => {
    it('updates recipe', async () => {
      let user = await createUser();

      let session = await createSession(user.id);

      let recipe = await createRecipe(user.id);

      let payload = {
        title: `new-${randomString(20)}`,
        description: `new-${randomString(20)}`,
        yield: `new-${randomString(20)}`,
        activeTime: `new-${randomString(20)}`,
        totalTime: `new-${randomString(20)}`,
        source: `new-${randomString(20)}`,
        url: `new-${randomString(20)}`,
        notes: `new-${randomString(20)}`,
        ingredients: `new-${randomString(20)}`,
        instructions: `new-${randomString(20)}`,
        folder: `new-${randomString(20)}`,
      }

      return request(server)
        .put(`/recipes/${recipe.id}`)
        .send(payload)
        .query({ token: session.token })
        .expect(200)
        .then(({ body }) =>
          Recipe.findById(recipe.id).then(updatedRecipe => {
            expect(updatedRecipe.title).to.equal(payload.title);
            expect(updatedRecipe.description).to.equal(payload.description);
            expect(updatedRecipe.yield).to.equal(payload.yield);
            expect(updatedRecipe.activeTime).to.equal(payload.activeTime);
            expect(updatedRecipe.totalTime).to.equal(payload.totalTime);
            expect(updatedRecipe.source).to.equal(payload.source);
            expect(updatedRecipe.url).to.equal(payload.url);
            expect(updatedRecipe.notes).to.equal(payload.notes);
            expect(updatedRecipe.ingredients).to.equal(payload.ingredients);
            expect(updatedRecipe.instructions).to.equal(payload.instructions);
            expect(updatedRecipe.folder).to.equal(payload.folder);
          })
        );
    });

    it('rejects invalid recipeId', async () => {
      let user = await createUser();

      let session = await createSession(user.id);

      let recipe = await createRecipe(user.id);

      return request(server)
        .put(`/recipes/invalid`)
        .send({})
        .query({ token: session.token })
        .expect(404);
    })

    it('rejects request if recipe does not belong to user', async () => {
      let user1 = await createUser();
      let user2 = await createUser();

      let session = await createSession(user1.id);

      let recipe = await createRecipe(user2.id);

      return request(server)
        .put(`/recipes/${recipe.id}`)
        .send({})
        .query({ token: session.token })
        .expect(404);
    })

    it('requires valid session', async () => {
      let user = await createUser();

      let session = await createSession(user.id);

      let recipe = await createRecipe(user.id);

      return request(server)
        .put(`/recipes/${recipe.id}`)
        .send({})
        .query({ token: 'invalid' })
        .expect(401);
    })
  })

  describe('delete', () => {
    it('deletes recipe', async () => {
      let user = await createUser();

      let session = await createSession(user.id);

      let recipe = await createRecipe(user.id);

      return request(server)
        .delete(`/recipes/${recipe.id}`)
        .query({ token: session.token })
        .expect(200)
        .then(({ body }) => {
          Recipe.findById(recipe.id).then(recipe => {
            expect(recipe).to.be.null
          })
        });
    })

    it('removes labels with only one association', async () => {
      let user = await createUser();

      let session = await createSession(user.id);

      let recipe = await createRecipe(user.id);

      let label1 = await createLabel(user.id);
      let label2 = await createLabel(user.id);

      await associateLabel(label1.id, recipe.id);
      await associateLabel(label2.id, recipe.id);

      return request(server)
        .delete(`/recipes/${recipe.id}`)
        .query({ token: session.token })
        .expect(200)
        .then(({ body }) =>
          Promise.all([
            Recipe.findById(recipe.id).then(deletedRecipe =>
              expect(deletedRecipe).to.be.null
            ),
            Label.findById(label1.id).then(deletedLabel1 =>
              expect(deletedLabel1).to.be.null
            ),
            Label.findById(label2.id).then(deletedLabel2 =>
              expect(deletedLabel2).to.be.null
            )
          ])
        );
    });

    it('does not remove labels with other associated recipes', async () => {
      let user = await createUser();

      let session = await createSession(user.id);

      let recipe1 = await createRecipe(user.id);
      let recipe2 = await createRecipe(user.id);

      let label = await createLabel(user.id);

      await associateLabel(label.id, recipe1.id);
      await associateLabel(label.id, recipe2.id);

      return request(server)
        .delete(`/recipes/${recipe1.id}`)
        .query({ token: session.token })
        .expect(200)
        .then(({ body }) =>
          Promise.all([
            Recipe.findById(recipe1.id).then(deletedRecipe1 =>
              expect(deletedRecipe1).to.be.null
            ),
            Recipe.findById(recipe2.id).then(notDeletedRecipe2 =>
              expect(notDeletedRecipe2).not.to.be.null
            ),
            Label.findById(label.id).then(deletedLabel =>
              expect(deletedLabel).not.to.be.null
            )
          ])
        );
    });

    it('rejects the request if user does not own recipe', async () => {
      let user1 = await createUser();
      let user2 = await createUser();

      let session = await createSession(user1.id);

      let recipe = await createRecipe(user2.id);

      return request(server)
        .delete(`/recipes/${recipe.id}`)
        .query({ token: session.token })
        .expect(404);
    });

    it('requires valid session', async () => {
      let user = await createUser();

      let session = await createSession(user.id);

      let recipe = await createRecipe(user.id);

      return request(server)
        .delete(`/recipes/${recipe.id}`)
        .query({ token: 'invalid' })
        .expect(401);
    });
  })
});
