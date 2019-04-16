let {
  expect
} = require('chai');

let sinon = require('sinon');
let aws = require('aws-sdk');
let request = require('request');
let path = require('path');

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
  sendBufferToS3,
  formatS3ImageResponse,
  sendURLToS3,
  sendFileToS3,
  dispatchImportNotification,
  dispatchMessageNotification,
  findFilesByRegex
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

  describe('sendBufferToS3', () => {
    // let s3PutObjectStub, s3PutObjectPromiseStub, fakeBody, result, etag

    // before(async () => {
    //   etag = randomString(20)

    //   s3PutObjectPromiseStub = sinon.stub().returns(Promise.resolve({
    //     ETag: etag
    //   }));

    //   s3PutObjectStub = sinon.stub(aws.S3.prototype, 'putObject').returns({
    //     promise: s3PutObjectStub
    //   });

    //   fakeBody = randomString(20)

    //   result = await sendBufferToS3(fakeBody)
    // })

    // after(() => {
    //   s3PutObjectStub.restore()
    // })

    // it('calls s3 putobject', () => {
    //   sinon.assert.calledOnce(s3PutObjectStub)
    //   sinon.assert.calledOnce(s3PutObjectPromiseStub)
    // })

    // it('returns required fields', () => {
    //   expect(result.key).to.be.a('string')
    //   expect(result.bucket).to.be.a('string')
    //   expect(result.acl).to.equal('public-read')
    //   expect(result.s3Response).to.be.an('object')
    //   expect(result.s3Response.ETag).to.equal(etag)
    // })
  })

  describe('formatS3ImageResponse', () => {
    it('returns formatted image object', () => {
      let key = "s3key"
      let mimetype = "mimetype/mimetype"
      let size = 200000
      let etag = randomString(20)
      let img = formatS3ImageResponse(key, mimetype, size, etag)

      expect(img.fieldname).to.equal("image")
      expect(img.originalname).to.equal("recipe-sage-img.jpg")
      expect(img.mimetype).to.equal(mimetype)
      expect(img.size).to.equal(size)
      expect(img.bucket).to.be.an.string
      expect(img.key).to.equal(key)
      expect(img.acl).to.equal("public-read")
      expect(img.metadata.fieldName).to.equal("image")

      expect(img.location).to.be.an.string
      expect(img.location).to.contain("https://")
      expect(img.location).to.contain(".s3.")
      expect(img.location).to.contain(".amazonaws.com/" + key)

      expect(img.etag).to.equal(etag)
    })
  })

  describe('sendURLToS3', () => {
    let fetchImageStub,
      convertImageStub,
      sendBufferToS3Stub,
      formatS3ImageResponseStub,
      etag,
      key,
      contentBody,
      convertedBuffer,
      formattedS3Response

    before(() => {
      contentBody = randomString(20)
      convertedBuffer = randomString(20)

      fetchImageStub = sinon.stub(UtilService, 'fetchImage').returns(Promise.resolve({
        body: contentBody
      }))

      convertImageStub = sinon.stub(UtilService, 'convertImage').returns(Promise.resolve(convertedBuffer))

      etag = randomString(20)
      key = randomString(20)

      sendBufferToS3Stub = sinon.stub(UtilService, 'sendBufferToS3').returns(Promise.resolve({
        s3Response: {
          ETag: etag
        },
        key
      }))

      formattedS3Response = {
        fieldname: "image",
        originalname: 'recipe-sage-img.jpg',
        mimetype: 'image/jpeg',
        size: 20,
        bucket: 'BUCKET',
        key: "key here",
        acl: "public-read",
        metadata: {
          fieldName: "image"
        },
        location: 'https://BUCKET.s3.REGION.amazonaws.com/KEY',
        etag
      }

      formatS3ImageResponseStub = sinon.stub(UtilService, 'formatS3ImageResponse').returns(Promise.resolve(formattedS3Response))
    })

    after(() => {
      fetchImageStub.restore();
      convertImageStub.restore();
      sendBufferToS3Stub.restore();
      formatS3ImageResponseStub.restore();
    })

    it('copies url to s3 bucket', () => {
      let fakeURL = randomString(20)
      return sendURLToS3(fakeURL).then(result => {
        sinon.assert.calledOnce(fetchImageStub)
        sinon.assert.calledWith(fetchImageStub, fakeURL)

        sinon.assert.calledOnce(convertImageStub)
        sinon.assert.calledWith(convertImageStub, contentBody)

        sinon.assert.calledOnce(sendBufferToS3Stub)
        sinon.assert.calledWith(sendBufferToS3Stub, convertedBuffer)

        sinon.assert.calledOnce(formatS3ImageResponseStub)
        sinon.assert.calledWith(formatS3ImageResponseStub, key, 'image/jpeg', 20, etag)

        expect(result).to.equal(formattedS3Response)
      })
    })
  })

  describe('sendFileToS3', () => {
    let sendBufferToS3Stub,
      formatS3ImageResponseStub,
      convertImageStub,
      etag,
      key,
      convertedBody,
      formattedS3Response,
      result

    before(async () => {
      contentLength = randomString(20)

      // We are not mocking fs calls here due to an issue with fs and sinon

      etag = randomString(20)
      key = randomString(20)
      convertedBody = randomString(20)

      convertImageStub = sinon.stub(UtilService, 'convertImage').returns(Promise.resolve(convertedBody))

      sendBufferToS3Stub = sinon.stub(UtilService, 'sendBufferToS3').returns(Promise.resolve({
        s3Response: {
          ETag: etag
        },
        key
      }))

      formattedS3Response = {
        fieldname: "image",
        originalname: 'recipe-sage-img.jpg',
        mimetype: 'image/jpeg',
        size: contentLength,
        bucket: 'BUCKET',
        key: "key here",
        acl: "public-read",
        metadata: {
          fieldName: "image"
        },
        location: 'https://BUCKET.s3.REGION.amazonaws.com/KEY',
        etag
      }

      formatS3ImageResponseStub = sinon.stub(UtilService, 'formatS3ImageResponse').returns(Promise.resolve(formattedS3Response))

      let exampleFilePath = './test/exampleFiles/img1.png'
      result = await sendFileToS3(exampleFilePath)
    })

    after(() => {
      convertImageStub.restore();
      sendBufferToS3Stub.restore();
      formatS3ImageResponseStub.restore();
    })

    it('copies url to s3 bucket', () => {
      sinon.assert.calledOnce(convertImageStub)

      sinon.assert.calledOnce(sendBufferToS3Stub)

      sinon.assert.calledOnce(formatS3ImageResponseStub)
      // 4324 is magic num of our test file size
      sinon.assert.calledWith(formatS3ImageResponseStub, key, 'image/jpeg', 4324, etag)

      expect(result).to.equal(formattedS3Response)
    })
  })

  describe('findFilesByRegex', () => {
    it('returns an array of file paths for test image img1.png', () => {
      let files = findFilesByRegex(path.join(__dirname, "../test/exampleFiles"), new RegExp("img1\.png", 'i'))

      expect(files[0].endsWith("test/exampleFiles/img1.png")).to.be.true
    })

    it('returns an array of file paths for test image img1.png recursive', () => {
      let files = findFilesByRegex(path.join(__dirname, "../test"), new RegExp("img1\.png", 'i'))

      expect(files[0].endsWith("/test/exampleFiles/img1.png")).to.be.true
    })

    it('returns empty array when it finds no files', () => {
      let files = findFilesByRegex("../test/exampleFiles", new RegExp("doesnotexist"))

      expect(files).to.be.an("array")
      expect(files).to.have.length(0)
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
      gripBroadcastStub = sinon.stub(GripService, 'broadcast').returns(Promise.resolve())
    })

    afterEach(() => {
      fcmSendMessagesStub.restore()
      gripBroadcastStub.restore()
    })

    it('accepts status 0 (complete)', async () => {
      await dispatchImportNotification({ fcmTokens }, 0, 'anyreason')

      expect(fcmSendMessagesStub.getCalls()[0].args[1].type).to.equal("import:pepperplate:complete")
      expect(gripBroadcastStub.getCalls()[0].args[1]).to.equal("import:pepperplate:complete")
    })

    it('accepts status 1 (failed)', async () => {
      await dispatchImportNotification({ fcmTokens }, 1, 'anyreason')

      expect(fcmSendMessagesStub.getCalls()[0].args[1].type).to.equal("import:pepperplate:failed")
      expect(gripBroadcastStub.getCalls()[0].args[1]).to.equal("import:pepperplate:failed")
    })

    it('accepts status 2 (working, progress)', async () => {
      await dispatchImportNotification({ fcmTokens }, 2, 'anyreason')

      expect(fcmSendMessagesStub.getCalls()[0].args[1].type).to.equal("import:pepperplate:working")
      expect(gripBroadcastStub.getCalls()[0].args[1]).to.equal("import:pepperplate:working")
    })

    it('rejects status higher than 2', async () => {
      await dispatchImportNotification({ fcmTokens }, 3, 'anyreason')

      expect(fcmSendMessagesStub.getCalls()).to.have.length(0)
      expect(gripBroadcastStub.getCalls()).to.have.length(0)
    })

    it('passes reason in message', async () => {
      let reason = 'myreasonhere'
      await dispatchImportNotification({ fcmTokens }, 0, reason)

      expect(fcmSendMessagesStub.getCalls()[0].args[1].reason).to.equal(reason)
      expect(gripBroadcastStub.getCalls()[0].args[2].reason).to.equal(reason)
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
