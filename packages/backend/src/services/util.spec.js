import { expect } from "chai";

import * as sinon from "sinon";
import * as path from "path";

import { setup, cleanup, randomString } from "../testutils.js";

import {
  validatePassword,
  validateEmail,
  sanitizeEmail,
  dispatchImportNotification,
  dispatchMessageNotification,
  findFilesByRegex,
} from "../services/util.js";

import * as FirebaseService from "../services/firebase.js";
import * as GripService from "../services/grip.js";

describe("utils", () => {
  beforeAll(async () => {
    await setup();
  });

  afterAll(async () => {
    await cleanup();
  });

  describe("validatePassword", () => {
    it("returns true for valid password", () => {
      expect(validatePassword("123456")).to.be.true;
    });

    it("returns false for short password", () => {
      expect(validatePassword("12345")).to.be.false;
    });

    it("returns false for null", () => {
      expect(validatePassword(null)).to.be.false;
    });

    it("returns false for undefined", () => {
      expect(validatePassword(undefined)).to.be.false;
    });
  });

  // Not a comprehensive test. Just gets a general idea for the matter
  describe("validateEmail", () => {
    it("returns true for valid emails", () => {
      expect(validateEmail("test@test.com")).to.be.true;
      expect(validateEmail("test@test.co")).to.be.true;
      expect(validateEmail("t@t.co")).to.be.true;
      expect(validateEmail("test.me@t.co")).to.be.true;
      expect(validateEmail("test+me@t.co")).to.be.true;
      expect(validateEmail("test-me@t.co")).to.be.true;
      expect(validateEmail("test-me@t.ca.rr")).to.be.true;
      expect(validateEmail("test-me@t.co.uk")).to.be.true;
    });

    it("returns false for invalid emails", () => {
      expect(validateEmail("")).to.be.false;
      expect(validateEmail("abc")).to.be.false;
      expect(validateEmail("@")).to.be.false;
      expect(validateEmail(".com")).to.be.false;
      expect(validateEmail("test@.com")).to.be.false;
      expect(validateEmail("abc@test")).to.be.false;
      expect(validateEmail("@test.com")).to.be.false;
      expect(validateEmail("com.@")).to.be.false;
      expect(validateEmail("te st@test.com")).to.be.false;
      expect(validateEmail("test @test.com")).to.be.false;
      expect(validateEmail("test@ test.com")).to.be.false;
      expect(validateEmail("test@te st.com")).to.be.false;
      expect(validateEmail("test@test .com")).to.be.false;
      expect(validateEmail("test@test. com")).to.be.false;
      expect(validateEmail("test@test.co m")).to.be.false;
    });
  });

  describe("sanitizeEmail", () => {
    it("removes spaces from either end", () => {
      expect(sanitizeEmail(" test@test.com ")).to.equal("test@test.com");
    });

    it("removes all capitalization", () => {
      expect(sanitizeEmail("tEsT@test.Com")).to.equal("test@test.com");
    });
  });

  describe("findFilesByRegex", () => {
    it("returns an array of file paths for test image img1.png", () => {
      let files = findFilesByRegex(
        path.join(__dirname, "../test/exampleFiles"),
        new RegExp(/img1\.png/, "i"),
      );

      expect(files[0].endsWith("test/exampleFiles/img1.png")).to.be.true;
    });

    it("returns an array of file paths for test image img1.png recursive", () => {
      let files = findFilesByRegex(
        path.join(__dirname, "../test"),
        new RegExp(/img1\.png/, "i"),
      );

      expect(files[0].endsWith("/test/exampleFiles/img1.png")).to.be.true;
    });

    it("returns empty array when it finds no files", () => {
      let files = findFilesByRegex(
        path.join(__dirname, "../test"),
        new RegExp("doesnotexist"),
      );

      expect(files).to.be.an("array");
      expect(files).to.have.length(0);
    });
  });

  describe("dispatchImportNotification", () => {
    let fcmTokens, fcmSendMessagesStub, gripBroadcastStub;

    beforeEach(() => {
      fcmTokens = [
        {
          id: "a",
          token: "token1",
        },
        {
          id: "b",
          token: "token2",
        },
      ];

      fcmSendMessagesStub = sinon
        .stub(FirebaseService, "sendMessages")
        .returns(Promise.resolve());
      gripBroadcastStub = sinon
        .stub(GripService, "broadcast")
        .returns(Promise.resolve());
    });

    afterEach(() => {
      fcmSendMessagesStub.restore();
      gripBroadcastStub.restore();
    });

    it("accepts status 0 (complete)", async () => {
      await dispatchImportNotification({ fcmTokens }, 0, "anyreason");

      expect(fcmSendMessagesStub.getCalls()[0].args[1].type).to.equal(
        "import:pepperplate:complete",
      );
      expect(gripBroadcastStub.getCalls()[0].args[1]).to.equal(
        "import:pepperplate:complete",
      );
    });

    it("accepts status 1 (failed)", async () => {
      await dispatchImportNotification({ fcmTokens }, 1, "anyreason");

      expect(fcmSendMessagesStub.getCalls()[0].args[1].type).to.equal(
        "import:pepperplate:failed",
      );
      expect(gripBroadcastStub.getCalls()[0].args[1]).to.equal(
        "import:pepperplate:failed",
      );
    });

    it("accepts status 2 (working, progress)", async () => {
      await dispatchImportNotification({ fcmTokens }, 2, "anyreason");

      expect(fcmSendMessagesStub.getCalls()[0].args[1].type).to.equal(
        "import:pepperplate:working",
      );
      expect(gripBroadcastStub.getCalls()[0].args[1]).to.equal(
        "import:pepperplate:working",
      );
    });

    it("rejects status higher than 2", async () => {
      await dispatchImportNotification({ fcmTokens }, 3, "anyreason");

      expect(fcmSendMessagesStub.getCalls()).to.have.length(0);
      expect(gripBroadcastStub.getCalls()).to.have.length(0);
    });

    it("passes reason in message", async () => {
      let reason = "myreasonhere";
      await dispatchImportNotification({ fcmTokens }, 0, reason);

      expect(fcmSendMessagesStub.getCalls()[0].args[1].reason).to.equal(reason);
      expect(gripBroadcastStub.getCalls()[0].args[2].reason).to.equal(reason);
    });

    it("calls with an array of fcmTokens", async () => {
      await dispatchImportNotification({ fcmTokens }, 0, "anyreason");

      expect(fcmSendMessagesStub.getCalls()[0].args[0][0]).to.equal(
        fcmTokens[0].token,
      );
      expect(fcmSendMessagesStub.getCalls()[0].args[0][1]).to.equal(
        fcmTokens[1].token,
      );
    });
  });

  describe("dispatchMessageNotification", () => {
    let userId, fcmTokens, message, fcmSendMessagesStub, gripBroadcastStub;

    beforeAll(async () => {
      userId = "15";
      fcmTokens = [
        {
          id: "a",
          token: "token1",
        },
        {
          id: "b",
          token: "token2",
        },
      ];
      message = {
        id: "22",
        body: randomString(2000),
        otherUser: {
          name: "test1",
        },
        fromUser: {
          name: "test1",
        },
        toUser: {
          name: "test2",
        },
        recipe: {
          id: "44",
          title: "recipeTitle",
          images: [
            {
              location: "location",
            },
          ],
        },
      };

      fcmSendMessagesStub = sinon
        .stub(FirebaseService, "sendMessages")
        .returns(Promise.resolve());
      gripBroadcastStub = sinon
        .stub(GripService, "broadcast")
        .returns(Promise.resolve());

      await dispatchMessageNotification({ id: userId, fcmTokens }, message);
    });

    afterAll(() => {
      fcmSendMessagesStub.restore();
      gripBroadcastStub.restore();
    });

    describe("fcm", () => {
      it("calls fcm sendMessages", () => {
        sinon.assert.calledOnce(fcmSendMessagesStub);
      });

      it("sends to all passed tokens", () => {
        expect(fcmSendMessagesStub.getCalls()[0].args[0][0]).to.equal(
          fcmTokens[0].token,
        );
        expect(fcmSendMessagesStub.getCalls()[0].args[0][1]).to.equal(
          fcmTokens[1].token,
        );
      });

      it("sends with correct type", () => {
        expect(fcmSendMessagesStub.getCalls()[0].args[1].type).to.equal(
          "messages:new",
        );
      });

      it("sends with correct message", () => {
        let stubMessageCall = fcmSendMessagesStub.getCalls()[0].args[1].message;
        expect(typeof stubMessageCall).to.equal("string");

        let parsedMessage = JSON.parse(stubMessageCall);

        expect(parsedMessage.id).to.equal("22");
        expect(parsedMessage.body).to.equal(message.body.substring(0, 1000));
        expect(parsedMessage.otherUser.name).to.equal("test1");
        expect(parsedMessage.fromUser.name).to.equal("test1");
        expect(parsedMessage.toUser.name).to.equal("test2");
        expect(parsedMessage.recipe.id).to.equal("44");
        expect(parsedMessage.recipe.title).to.equal("recipeTitle");
        expect(parsedMessage.recipe.images[0].location).to.equal("location");
      });

      it("sends no additional fields", () => {
        let stubMessageCall = fcmSendMessagesStub.getCalls()[0].args[1];
        expect(Object.keys(stubMessageCall)).to.have.length(2);

        let parsedMessage = JSON.parse(stubMessageCall.message);
        expect(Object.keys(parsedMessage)).to.have.length(6);
        expect(Object.keys(parsedMessage.recipe)).to.have.length(3);
        expect(Object.keys(parsedMessage.recipe.images)).to.have.length(1);
      });
    });

    describe("grip", () => {
      it("calls grip broadcast", () => {
        sinon.assert.calledOnce(gripBroadcastStub);
      });

      it("sends to user channel", () => {
        expect(gripBroadcastStub.getCalls()[0].args[0]).to.equal(userId);
      });

      it("sends with correct type", () => {
        expect(gripBroadcastStub.getCalls()[0].args[1]).to.equal(
          "messages:new",
        );
      });

      it("sends with correct message", () => {
        let stubMessageCall = gripBroadcastStub.getCalls()[0].args[2];

        // Message should be immutable
        expect(stubMessageCall).to.not.equal(message);
        expect(stubMessageCall.id).to.equal(message.id);
        expect(stubMessageCall.body).to.equal(message.body.substring(0, 1000));

        // Users should be mutable
        expect(stubMessageCall.otherUser).to.equal(message.otherUser);
        expect(stubMessageCall.fromUser).to.equal(message.fromUser);
        expect(stubMessageCall.toUser).to.equal(message.toUser);

        // Recipe should be immutable
        expect(stubMessageCall.recipe).to.not.equal(message.recipe);
        expect(stubMessageCall.recipe.id).to.equal(message.recipe.id);
        expect(stubMessageCall.recipe.title).to.equal(message.recipe.title);

        // Recipe image should be immutable
        expect(stubMessageCall.recipe.images).to.not.equal(
          message.recipe.images,
        );
        expect(stubMessageCall.recipe.images[0].location).to.equal(
          message.recipe.images[0].location,
        );
      });

      it("sends no additional fields", () => {
        let stubMessageCall = gripBroadcastStub.getCalls()[0].args[2];
        expect(Object.keys(stubMessageCall)).to.have.length(6);
        expect(Object.keys(stubMessageCall.recipe)).to.have.length(3);
        expect(stubMessageCall.recipe.images).to.have.length(1);
        expect(Object.keys(stubMessageCall.recipe.images[0])).to.have.length(1);
      });
    });
  });
});
