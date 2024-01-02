import * as request from "supertest";
import { expect } from "chai";
import Sequelize from "sequelize";
const Op = Sequelize.Op;

import {
  setup,
  cleanup,
  randomString,
  createUser,
  createSession,
  createShoppingList,
} from "../testutils";

import Models from "../models";
const { ShoppingList } = Models;

describe("shopping Lists", () => {
  let server;
  beforeAll(async () => {
    server = await setup();
  });

  afterAll(async () => {
    await cleanup();
  });

  it("succeeds with no collaborators", async () => {
    const user = await createUser();

    const session = await createSession(user.id);

    const initialCount = await ShoppingList.count();

    const payload = {
      title: randomString(20),
    };

    return request(server)
      .post("/shoppingLists")
      .query({ token: session.token })
      .send(payload)
      .expect(200)
      .then(({ body }) =>
        ShoppingList.findOne({
          where: {
            [Op.and]: [payload, { id: body.id, userId: user.id }],
          },
        }).then(async (shoppingList) => {
          expect(shoppingList).not.to.be.null;
          const count = await ShoppingList.count();
          expect(count).to.equal(initialCount + 1);
        }),
      );
  });

  it("succeeds with collaborators", async () => {
    const user = await createUser();
    const user2 = await createUser();

    const session = await createSession(user.id);

    const initialCount = await ShoppingList.count();

    const payload = {
      title: randomString(20),
      collaborators: [user2.id],
    };

    return request(server)
      .post("/shoppingLists")
      .query({ token: session.token })
      .send(payload)
      .expect(200)
      .then(({ body }) =>
        ShoppingList.findOne({
          where: {
            id: body.id,
          },
        }).then(async (shoppingList) => {
          expect(shoppingList).not.to.be.null;
          const count = await ShoppingList.count();
          expect(count).to.equal(initialCount + 1);
        }),
      );
  });

  it("rejects if no title is present", async () => {
    const user = await createUser();

    const session = await createSession(user.id);

    const initialCount = await ShoppingList.count();

    const payload = {};

    return request(server)
      .post("/shoppingLists")
      .query({ token: session.token })
      .send(payload)
      .expect(412)
      .then(async () => {
        const count = await ShoppingList.count();
        expect(count).to.equal(initialCount);
      });
  });

  it("reject invalid token", async () => {
    const initialCount = await ShoppingList.count();

    const payload = {
      title: randomString(20),
    };

    return request(server)
      .post("/shoppingLists")
      .query({ token: "invalid" })
      .send(payload)
      .expect(401)
      .then(async () => {
        const count = await ShoppingList.count();
        expect(count).to.equal(initialCount);
      });
  });

  it("return Shoppinglist", async () => {
    const user = await createUser();

    const session = await createSession(user.id);

    const shoppingList = await createShoppingList(user.id);

    return request(server)
      .get(`/shoppingLists/${shoppingList.id}`)
      .query({ token: session.token })
      .expect(200)
      .then(({ body }) => {
        expect(body.id).to.equal(shoppingList.id);
        expect(body.title).to.equal(shoppingList.title);
      });
  });
});
