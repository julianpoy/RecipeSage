// test/sample.test.ts
// import { prisma } from "@recipesage/prisma";
// import nock from 'nock';
import * as request from "supertest";

describe("shopping Lists", () => {
  // beforeAll(async () => {
  //   server = await setup();
  // });
  it("create recipe", async () => {
    // const server = await import('../../index');
    // const app = express();
    // app.use(trpcExpressMiddleware);
    // const app = await import('@recipesage/backend');
    const app = await import("../../../../backend/src/app");
    const mockSession = { userId: "mockUserId" };

    // Mock Prisma response for label.findFirst
    // nock('http://prisma-endpoint')
    //   .post('/label/findFirst')
    //   .reply(200, []);

    let response;
    try {
      response = await request(app.app)
        .post("/trpc/recipes.createRecipe")
        .send({
          title: "Test Recipe",
          description: "Test description",
          // ... other required fields
        })
        .set("Authorization", "Bearer mockAccessToken") // Add your authentication token here
        .set(
          "Cookie",
          `your-session-cookie=${encodeURIComponent(
            JSON.stringify(mockSession),
          )}`,
        );
    } catch (err) {
      console.log(err);
    }
    console.log(response);
  });
});
