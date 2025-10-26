import request from "supertest";
import Sequelize from "sequelize";
const Op = Sequelize.Op;

import {
  setup,
  cleanup,
  randomString,
  createUser,
  createSession,
  createShoppingList,
  superjsonResult,
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

    const payload = {
      title: randomString(20),
    };

    const { body } = await request(server)
      .post("/shoppingLists")
      .query({ token: session.token })
      .send(payload)
      .expect(superjsonResult(200));

    const shoppingList = await ShoppingList.findOne({
      where: {
        [Op.and]: [payload, { id: body.id, userId: user.id }],
      },
    });

    expect(shoppingList).not.toBeNull();

    const count = await ShoppingList.count({
      where: {
        userId: user.id,
      },
    });
    expect(count).toBe(1);
  });

  it("succeeds with collaborators", async () => {
    const user = await createUser();
    const user2 = await createUser();
    const session = await createSession(user.id);

    const payload = {
      title: randomString(20),
      collaborators: [user2.id],
    };

    const { body } = await request(server)
      .post("/shoppingLists")
      .query({ token: session.token })
      .send(payload)
      .expect(superjsonResult(200));

    const shoppingList = await ShoppingList.findOne({
      where: {
        id: body.id,
      },
    });

    expect(shoppingList).not.toBeNull();

    const count = await ShoppingList.count({
      where: {
        userId: user.id,
      },
    });
    expect(count).toBe(1);
  });

  it("rejects if no title is present", async () => {
    const user = await createUser();
    const session = await createSession(user.id);

    const payload = {};

    await request(server)
      .post("/shoppingLists")
      .query({ token: session.token })
      .send(payload)
      .expect(superjsonResult(412));

    const count = await ShoppingList.count({
      where: {
        userId: user.id,
      },
    });
    expect(count).toBe(0);
  });

  it("reject invalid token", async () => {
    const payload = {
      title: randomString(20),
    };

    await request(server)
      .post("/shoppingLists")
      .query({ token: "invalid" })
      .send(payload)
      .expect(superjsonResult(401));
  });

  it("return Shoppinglist", async () => {
    const user = await createUser();
    const session = await createSession(user.id);
    const shoppingList = await createShoppingList(user.id);

    const { body } = await request(server)
      .get(`/shoppingLists/${shoppingList.id}`)
      .query({ token: session.token })
      .expect(superjsonResult(200));

    expect(body.id).toBe(shoppingList.id);
    expect(body.title).toBe(shoppingList.title);
  });
});
