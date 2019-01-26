let {
  expect
} = require('chai');

let sinon = require('sinon');
var request = require('request');

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
  associateLabel,
  createMessage,
  secureUserMatch,
  secureRecipeMatch
} = require('../testutils');

let {
  validatePassword,
  validateEmail,
  sanitizeEmail,
  sendmail,
  fetchImage,
  sendURLToS3,
  _findTitle,
  findTitle,
  shareRecipe,
  dispatchImportNotification,
  dispatchMessageNotification
} = require('../services/util');

let UtilService = require('../services/util')
let FirebaseService = require('../services/firebase');
let GripService = require('../services/grip');

// DB
var Op = require("sequelize").Op;
var SQ = require('../models').sequelize;
var User = require('../models').User;
var FCMToken = require('../models').FCMToken;
var Session = require('../models').Session;
var Recipe = require('../models').Recipe;
var Label = require('../models').Label;
var Message = require('../models').Message;

var aws = require('aws-sdk');

describe('utils', () => {
  let server
  before(async () => {
    server = await setup();
  })

  after(async () => {
    await cleanup(server);
  })

  describe('validatePassword', () => {
    it('returns true for valid password', () => {
      expect(validatePassword('123456')).to.be.true
    })

    it('returns false for short password', () => {
      expect(validatePassword('12345')).to.be.false
    })

    it('returns false for null', () => {
      expect(validatePassword(null)).to.be.false
    })

    it('returns false for undefined', () => {
      expect(validatePassword(undefined)).to.be.false
    })
  })

  // Not a comprehensive test. Just gets a general idea for the matter
  describe('validateEmail', () => {
    it('returns true for valid emails', () => {
      expect(validateEmail('test@test.com')).to.be.true
      expect(validateEmail('test@test.co')).to.be.true
      expect(validateEmail('t@t.co')).to.be.true
      expect(validateEmail('test.me@t.co')).to.be.true
      expect(validateEmail('test+me@t.co')).to.be.true
      expect(validateEmail('test-me@t.co')).to.be.true
      expect(validateEmail('test-me@t.ca.rr')).to.be.true
      expect(validateEmail('test-me@t.co.uk')).to.be.true
    })

    it('returns false for invalid emails', () => {
      expect(validateEmail('')).to.be.false
      expect(validateEmail('abc')).to.be.false
      expect(validateEmail('@')).to.be.false
      expect(validateEmail('.com')).to.be.false
      expect(validateEmail('test@.com')).to.be.false
      expect(validateEmail('abc@test')).to.be.false
      expect(validateEmail('@test.com')).to.be.false
      expect(validateEmail('com.@')).to.be.false
      expect(validateEmail('te st@test.com')).to.be.false
      expect(validateEmail('test @test.com')).to.be.false
      expect(validateEmail('test@ test.com')).to.be.false
      expect(validateEmail('test@te st.com')).to.be.false
      expect(validateEmail('test@test .com')).to.be.false
      expect(validateEmail('test@test. com')).to.be.false
      expect(validateEmail('test@test.co m')).to.be.false
    })
  })

  describe('sanitizeEmail', () => {
    it('removes spaces from either end', () => {
      expect(sanitizeEmail(' test@test.com ')).to.equal('test@test.com')
    })

    it('removes all capitalization', () => {
      expect(sanitizeEmail('tEsT@test.Com')).to.equal('test@test.com')
    })
  })

  describe('sendmail', () => {
    let sesStub, sesSendEmailStub

    before(() => {
      // sinon.stub(aws, 'S3')
      sesSendEmailStub = sinon.stub().returns({
        promise: () => Promise.resolve({
          messageId: randomString(20)
        })
      })

      sesStub = sinon.stub(aws, 'SES').returns({
        sendEmail: sesSendEmailStub
      })
    })

    after(() => {
      sesStub.restore();
    })

    it('sends and email', () => {
      let toAddresses = [randomEmail(), randomEmail()]
      let ccAddresses = [randomEmail(), randomEmail()]

      let subject = randomString(20)
      let html = randomString(20)
      let plain = randomString(20)

      return sendmail(toAddresses, ccAddresses, subject, html, plain).then(() => {
        sinon.assert.calledOnce(sesStub);
        sinon.assert.calledOnce(sesSendEmailStub);
        let {
          Destination: {
            CcAddresses,
            ToAddresses
          },
          Message: {
            Body: {
              Html,
              Text
            },
            Subject
          },
          Source,
          ReplyToAddresses
        } = sesSendEmailStub.getCalls()[0].args[0]

        // expect(CcAddresses).to.have.length(2)
        expect(CcAddresses).to.equal(ccAddresses)

        // expect(ToAddresses).to.have.length(2)
        expect(ToAddresses).to.equal(toAddresses)

        expect(Html.Charset).to.equal('UTF-8')
        expect(Html.Data).to.equal(html)

        expect(Text.Charset).to.equal('UTF-8')
        expect(Text.Data).to.equal(plain)

        expect(Subject.Charset).to.equal('UTF-8')
        expect(Subject.Data).to.equal(subject)

        expect(Source).to.equal('"RecipeSage" <noreply@recipesage.com>')

        expect(ReplyToAddresses).to.have.length(1)
        expect(ReplyToAddresses).to.contain('noreply@recipesage.com')
      })
    })
  })

  describe('sendURLToS3', () => {
    let fetchImageStub, s3Stub, s3PutObjectStub, etag, contentType, contentLength

    before(() => {
      contentType = randomString(20)
      contentLength = randomString(20)

      fetchImageStub = sinon.stub(UtilService, 'fetchImage').returns(Promise.resolve({
        res: {
          headers: {
            'content-type': contentType,
            'content-length': contentLength
          }
        },
        body: randomString(20)
      }))

      etag = randomString(20)
      s3PutObjectStub = sinon.stub().returns({
        promise: () => Promise.resolve({
          ETag: etag
        })
      })

      s3Stub = sinon.stub(aws, 'S3').returns({
        putObject: s3PutObjectStub
      })
    })

    after(() => {
      fetchImageStub.restore();
      s3Stub.restore();
    })

    it('copies url to s3 bucket', () => {
      return sendURLToS3(randomString(20)).then(img => {

        let {
          fieldname,
          originalname,
          mimetype,
          size,
          bucket,
          key,
          acl,
          metadata: {
            fieldName
          },
          location,
          etag
        } = img

        expect(fieldname).to.equal("image")
        expect(originalname).to.equal("recipe-sage-img.jpg")
        expect(mimetype).to.equal(contentType)
        expect(size).to.equal(contentLength)
        expect(bucket).to.be.an.string
        expect(key).to.be.an.string
        expect(acl).to.equal("public-read")
        expect(fieldName).to.equal("image")

        expect(location).to.be.an.string
        expect(location).to.contain("https://")
        expect(location).to.contain(".s3.")
        expect(location).to.contain(".amazonaws.com/" + key)

        expect(img.etag).to.equal(etag)
      })
    })
  })

  describe('fetchImage', () => {
    let requestGetStub

    before(() => {
      requestGetStub = sinon.stub(request, 'get').callsFake((opts, cb) => {
        cb();
      })
    })

    after(() => {
      requestGetStub.restore();
    })

    it('calls request.get', () => {
      let url = randomString(20)

      return fetchImage(url).then(img => {

        sinon.assert.calledOnce(requestGetStub)
        let opts = requestGetStub.getCalls()[0].args[0]

        expect(opts.url).to.equal(url)
        expect(opts.encoding).to.equal(null)
      })
    })
  })

  describe('findTitle', () => {
    let _findTitleStub

    before(() => {
      _findTitleStub = sinon.stub(UtilService, '_findTitle').returns(Promise.resolve())
    })

    after(() => {
      _findTitleStub.restore();
    })

    it('calls and returns result of _findTitle with proper args', () => {
      let userId = randomString(20)
      let recipeId = randomString(20)
      let basename = randomString(20)
      let transaction = randomString(20)

      return findTitle(userId, recipeId, basename, transaction).then(() => {

        sinon.assert.calledOnce(_findTitleStub)
        let opts = _findTitleStub.getCalls()[0].args

        expect(opts[0]).to.equal(userId)
        expect(opts[1]).to.equal(recipeId)
        expect(opts[2]).to.equal(basename)
        expect(opts[3]).to.equal(transaction)
        expect(opts[4]).to.equal(1) // recursive start idx
      })
    })
  })

  describe('_findTitle', () => {
    beforeEach(async () => {
      await syncDB();
    });

    it('returns initial name when no conflicts arise', async () => {
      let user = await createUser()

      let recipe = await createRecipe(user.id)

      return SQ.transaction(t => {
        return findTitle(user.id, recipe.id, recipe.title, t).then(adjustedTitle => {
          expect(adjustedTitle).to.equal(recipe.title)
        })
      })
    })

    it('returns incremented name when conflict arises', async () => {
      let user = await createUser()

      let recipe1 = await createRecipe(user.id)
      let recipe2 = await createRecipe(user.id)

      return SQ.transaction(t => {
        return findTitle(user.id, recipe1.id, recipe2.title, t).then(adjustedTitle => {
          expect(adjustedTitle).to.equal(recipe2.title + " (2)")
        })
      })
    })

    it('returns initial name when no conflicts arise with no recipeId', async () => {
      let user = await createUser()

      return SQ.transaction(t => {
        let desiredTitle = randomString(20)
        return findTitle(user.id, null, desiredTitle, t).then(adjustedTitle => {
          expect(adjustedTitle).to.equal(desiredTitle)
        })
      })
    })

    it('returns incremented name when conflict arises with no recipeId', async () => {
      let user = await createUser()

      let recipe1 = await createRecipe(user.id)

      return SQ.transaction(t => {
        return findTitle(user.id, null, recipe1.title, t).then(adjustedTitle => {
          expect(adjustedTitle).to.equal(recipe1.title + " (2)")
        })
      })
    })
  })

  describe('shareRecipe', () => {
    let findTitleStub
    before(async () => {
      await syncDB();
      findTitleStub = sinon.stub(UtilService, 'findTitle').callsFake((a, b, title) => Promise.resolve(title))
    });

    after(() => {
      findTitleStub.restore();
    })

    describe('shares recipe to recipient', () => {
      let user1, user2, recipe, sharedRecipe
      before(async () => {
        user1 = await createUser()
        user2 = await createUser()

        recipe = await createRecipe(user1.id)

        await SQ.transaction(async t => {
          sharedRecipe = await shareRecipe(recipe.id, user1.id, user2.id, t)
        })
      })

      it('creates a new recipe', async () => {
        expect(recipe.id).not.to.equal(sharedRecipe.id)

        return Promise.all([
          Recipe.count().then(count => expect(count).to.equal(2)),
          Recipe.findById(recipe.id).then(r => expect(r).to.not.be.null),
          Recipe.findById(sharedRecipe.id).then(r => expect(r).to.not.be.null)
        ])
      })

      it('creates the recipes under the proper owners', () => {
        expect(recipe.userId).to.equal(user1.id)
        expect(sharedRecipe.userId).to.equal(user2.id)
      })

      it('includes the same data as original recipe', () => {
        expect(recipe.title).to.equal(sharedRecipe.title)
        expect(recipe.description).to.equal(sharedRecipe.description)
        expect(recipe.yield).to.equal(sharedRecipe.yield)
        expect(recipe.activeTime).to.equal(sharedRecipe.activeTime)
        expect(recipe.totalTime).to.equal(sharedRecipe.totalTime)
        expect(recipe.source).to.equal(sharedRecipe.source)
        expect(recipe.url).to.equal(sharedRecipe.url)
        expect(recipe.notes).to.equal(sharedRecipe.notes)
        expect(recipe.ingredients).to.equal(sharedRecipe.ingredients)
        expect(recipe.instructions).to.equal(sharedRecipe.instructions)
        // expect(recipe.image).to.equal(sharedRecipe.image)
      })

      it('sets the fromUserId to the sending user', () => {
        expect(sharedRecipe.fromUserId).to.equal(user1.id)
      })

      it('sets the folder to inbox on new recipe', () => {
        expect(sharedRecipe.folder).to.equal('inbox')
      })
    })
  })

  describe('dispatchImportNotification', () => {
    let fcmTokens, fcmSendMessagesStub

    beforeEach(() => {
      fcmTokens = [{
        id: 'a',
        token: 'token1'
      }, {
        id: 'b',
        token: 'token2'
      }]

      fcmSendMessagesStub = sinon.stub(FirebaseService, 'sendMessages').returns(Promise.resolve())
    })

    afterEach(() => {
      fcmSendMessagesStub.restore()
    })

    it('accepts status 0 (complete)', async () => {
      await dispatchImportNotification({ fcmTokens }, 0, 'anyreason')

      expect(fcmSendMessagesStub.getCalls()[0].args[1].type).to.equal("import:pepperplate:complete")
    })

    it('accepts status 1 (failed)', async () => {
      await dispatchImportNotification({ fcmTokens }, 1, 'anyreason')

      expect(fcmSendMessagesStub.getCalls()[0].args[1].type).to.equal("import:pepperplate:failed")
    })

    it('accepts status 2 (working, progress)', async () => {
      await dispatchImportNotification({ fcmTokens }, 2, 'anyreason')

      expect(fcmSendMessagesStub.getCalls()[0].args[1].type).to.equal("import:pepperplate:working")
    })

    it('rejects status higher than 2', async () => {
      await dispatchImportNotification({ fcmTokens }, 3, 'anyreason')

      expect(fcmSendMessagesStub.getCalls()).to.have.length(0)
    })

    it('passes reason in message', async () => {
      let reason = 'myreasonhere'
      await dispatchImportNotification({ fcmTokens }, 0, reason)

      expect(fcmSendMessagesStub.getCalls()[0].args[1].reason).to.equal(reason)
    })

    it('calls with an array of fcmTokens', async () => {
      await dispatchImportNotification({ fcmTokens }, 0, 'anyreason')

      expect(fcmSendMessagesStub.getCalls()[0].args[0][0]).to.equal(fcmTokens[0].token)
      expect(fcmSendMessagesStub.getCalls()[0].args[0][1]).to.equal(fcmTokens[1].token)
    })
  })

  describe('dispatchMessageNotification', () => {
    let userId, fcmTokens, message, fcmSendMessagesStub, gripBroadcastStub

    before(async () => {
      userId = "15"
      fcmTokens = [{
        id: 'a',
        token: 'token1'
      }, {
        id: 'b',
        token: 'token2'
      }]
      message = {
        id: "22",
        body: randomString(2000),
        otherUser: {
          name: "test1"
        },
        fromUser: {
          name: "test1"
        },
        toUser: {
          name: "test2"
        },
        recipe: {
          id: "44",
          title: "recipeTitle",
          image: {
            location: "location"
          }
        }
      }

      fcmSendMessagesStub = sinon.stub(FirebaseService, 'sendMessages').returns(Promise.resolve())
      gripBroadcastStub = sinon.stub(GripService, 'broadcast').returns(Promise.resolve())

      await dispatchMessageNotification({ id: userId, fcmTokens }, message)
    })

    after(() => {
      fcmSendMessagesStub.restore()
      gripBroadcastStub.restore()
    })

    describe('fcm', () => {
      it('calls fcm sendMessages', () => {
        sinon.assert.calledOnce(fcmSendMessagesStub)
      })

      it('sends to all passed tokens', () => {
        expect(fcmSendMessagesStub.getCalls()[0].args[0][0]).to.equal(fcmTokens[0].token)
        expect(fcmSendMessagesStub.getCalls()[0].args[0][1]).to.equal(fcmTokens[1].token)
      })

      it('sends with correct type', () => {
        expect(fcmSendMessagesStub.getCalls()[0].args[1].type).to.equal("messages:new")
      })

      it('sends with correct message', () => {
        let stubMessageCall = fcmSendMessagesStub.getCalls()[0].args[1].message
        expect(typeof stubMessageCall).to.equal("string")

        let parsedMessage = JSON.parse(stubMessageCall)

        expect(parsedMessage.id).to.equal("22")
        expect(parsedMessage.body).to.equal(message.body.substring(0, 1000))
        expect(parsedMessage.otherUser.name).to.equal("test1")
        expect(parsedMessage.fromUser.name).to.equal("test1")
        expect(parsedMessage.toUser.name).to.equal("test2")
        expect(parsedMessage.recipe.id).to.equal("44")
        expect(parsedMessage.recipe.title).to.equal("recipeTitle")
        expect(parsedMessage.recipe.image.location).to.equal("location")
      })

      it('sends no additional fields', () => {
        let stubMessageCall = fcmSendMessagesStub.getCalls()[0].args[1]
        expect(Object.keys(stubMessageCall)).to.have.length(2)

        let parsedMessage = JSON.parse(stubMessageCall.message)
        expect(Object.keys(parsedMessage)).to.have.length(6)
        expect(Object.keys(parsedMessage.recipe)).to.have.length(3)
        expect(Object.keys(parsedMessage.recipe.image)).to.have.length(1)
      })
    })

    describe('grip', () => {
      it('calls grip broadcast', () => {
        sinon.assert.calledOnce(gripBroadcastStub)
      })

      it('sends to user channel', () => {
        expect(gripBroadcastStub.getCalls()[0].args[0]).to.equal(userId)
      })

      it('sends with correct type', () => {
        expect(gripBroadcastStub.getCalls()[0].args[1]).to.equal("messages:new")
      })

      it('sends with correct message', () => {
        let stubMessageCall = gripBroadcastStub.getCalls()[0].args[2]

        // Message should be immutable
        expect(stubMessageCall).to.not.equal(message)
        expect(stubMessageCall.id).to.equal(message.id)
        expect(stubMessageCall.body).to.equal(message.body.substring(0, 1000))

        // Users should be mutable
        expect(stubMessageCall.otherUser).to.equal(message.otherUser)
        expect(stubMessageCall.fromUser).to.equal(message.fromUser)
        expect(stubMessageCall.toUser).to.equal(message.toUser)

        // Recipe should be immutable
        expect(stubMessageCall.recipe).to.not.equal(message.recipe)
        expect(stubMessageCall.recipe.id).to.equal(message.recipe.id)
        expect(stubMessageCall.recipe.title).to.equal(message.recipe.title)

        // Recipe image should be immutable
        expect(stubMessageCall.recipe.image).to.not.equal(message.recipe.image)
        expect(stubMessageCall.recipe.image.location).to.equal(message.recipe.image.location)
      })

      it('sends no additional fields', () => {
        let stubMessageCall = gripBroadcastStub.getCalls()[0].args[2]
        expect(Object.keys(stubMessageCall)).to.have.length(6)
        expect(Object.keys(stubMessageCall.recipe)).to.have.length(3)
        expect(Object.keys(stubMessageCall.recipe.image)).to.have.length(1)
      })
    })
  })
});
