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
  secureUserMatch
} = require('../testutils');

// DB
var User = require('../models').User;
var Session = require('../models').Session;

describe('users', () => {
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

  describe('register', () => {
    it('success', async () => {
      let payload = {
        name: randomString(20),
        email: randomEmail(),
        password: '123456'
      };

      return request(server)
        .post('/users/register')
        .send(payload)
        .expect(200)
        .then(({ body }) =>
          Session.findOne({
            where: {
              token: body.token
            }
          }).then(session => {
            expect(session).not.to.be.null;

            return User.findOne({
              where: {
                id: session.userId,
                email: payload.email,
                name: payload.name
              }
            }).then(user => {
              expect(user).not.to.be.null;
            });
          })
        );
    });

    it('rejects invalid email', async () => {
      let payload = {
        name: randomString(20),
        email: 'invalid',
        password: '123456'
      };

      return request(server)
        .post('/users/register')
        .send(payload)
        .expect(412);
    });

    it('rejects short password', async () => {
      let payload = {
        name: randomString(20),
        email: randomEmail(),
        password: 'short'
      };

      return request(server)
        .post('/users/register')
        .send(payload)
        .expect(411);
    });

    it('rejects if email already registered', async () => {
      let user = await createUser();

      let payload = {
        name: randomString(20),
        email: user.email,
        password: '123456'
      };

      return request(server)
        .post('/users/register')
        .send(payload)
        .expect(406);
    });
  });

  describe('login', () => {
    it('success', async () => {
      let user = await createUser();

      let payload = {
        email: user.email,
        password: '123456'
      };

      return request(server)
        .post('/users/login')
        .send(payload)
        .expect(200)
        .then(({ body }) =>
          Session.findOne({
            where: {
              userId: user.id,
              token: body.token
            }
          }).then(session => {
            expect(session).not.to.be.null;
          })
        );
    });

    it('rejects incorrect email', async () => {
      await createUser();

      let payload = {
        email: 'incorrect@gmail.com',
        password: '123456'
      };

      return request(server)
        .post('/users/login')
        .send(payload)
        .expect(412);
    });

    it('rejects incorrect password', async () => {
      let user = await createUser();

      let payload = {
        email: user.email,
        password: 'incorrect'
      };

      return request(server)
        .post('/users/login')
        .send(payload)
        .expect(412);
    });
  });

  describe('update', () => {
    it('success', async () => {
      let user = await createUser();

      let payload = {
        email: user.email,
        password: '123456'
      };

      return request(server)
        .post('/users/login')
        .send(payload)
        .expect(200)
        .then(({ body }) =>
          Session.findOne({
            where: {
              userId: user.id,
              token: body.token
            }
          }).then(session => {
            expect(session).not.to.be.null;
          })
        );
    });

    it('rejects incorrect email', async () => {
      await createUser();

      let payload = {
        email: 'incorrect@gmail.com',
        password: '123456'
      };

      return request(server)
        .post('/users/login')
        .send(payload)
        .expect(412);
    });

    it('rejects incorrect password', async () => {
      let user = await createUser();

      let payload = {
        email: user.email,
        password: 'incorrect'
      };

      return request(server)
        .post('/users/login')
        .send(payload)
        .expect(412);
    });
  });

  describe('get user by-email', () => {
    it('returns user info', async () => {
      let user = await createUser();

      return request(server)
        .get('/users/by-email')
        .query({ email: user.email })
        .expect(200)
        .then(({ body }) =>
          secureUserMatch(body, user)
        );
    });

    it('rejects non-existent email', async () => {
      let user = await createUser();

      return request(server)
        .get('/users/by-email')
        .query({ email: 'a' + user.email })
        .expect(404);
    });
  });

  describe('user self', () => {
    it('returns user info', async () => {
      let user = await createUser();

      let session = await createSession(user.id);

      return request(server)
        .get('/users/')
        .query({ token: session.token })
        .expect(200)
        .then(({ body }) => {
          expect(body.id).to.equal(user.id);
          expect(body.name).to.equal(user.name);
          expect(body.email).to.equal(user.email);
          expect((new Date(body.createdAt)).getTime()).to.equal((new Date(user.createdAt)).getTime());
          expect((new Date(body.updatedAt)).getTime()).to.equal((new Date(user.updatedAt)).getTime());
        });
    });
  });

  describe('sessioncheck', () => {
    it('accepts valid session', async () => {
      let user = await createUser();

      let session = await createSession(user.id);

      return request(server)
        .get('/users/sessioncheck')
        .query({ token: session.token })
        .expect(200);
    });

    it('denies invalid session', async () => {
      return request(server)
        .get('/users/sessioncheck')
        .query({ token: 'invalid' })
        .expect(401);
    });
  });
});
