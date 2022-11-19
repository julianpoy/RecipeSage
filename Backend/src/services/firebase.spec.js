// let {
//   expect
// } = require('chai');

// let sinon = require('sinon');

// let admin = require("firebase-admin");

// let FCMToken = require('../models').FCMToken;

// let {
//   randomString,
//   randomEmail,
// } = require('../testutils');

// let {
//   sendMessages,
//   sendMessage
// } = require('./firebase')

// let FirebaseService = require('./firebase');


// describe('firebase', () => {
//   let firebaseStub

//   beforeAll(() => {
//     firebaseStub = sinon.stub()

//     Object.defineProperty(admin, 'messaging', { get: () => firebaseStub });
//   })

//   describe('sendMessage', () => {
//     describe('success', () => {
//       let fcmSendStub, fcmSendMessageStub

//       beforeAll(async () => {
//         fcmSendStub = sinon.stub().returns(Promise.resolve())

//         firebaseStub.reset()
//         firebaseStub.returns({
//           send: fcmSendStub
//         })

//         fcmSendMessageStub = sinon.stub(FCMToken, 'destroy').returns(Promise.resolve())

//         token = "testToken"

//         payload = {}

//         await sendMessage(token, payload)
//       })

//       afterAll(() => {
//         fcmSendMessageStub.restore()
//       })

//       it('calls fcmSendStub', () => {
//         sinon.assert.calledOnce(fcmSendStub)
//       })

//       it('calls fcmAdminMessagingStub', () => {
//         sinon.assert.calledOnce(firebaseStub)
//       })

//       it('does not destroy fcm token', () => {
//         sinon.assert.notCalled(fcmSendMessageStub)
//       })

//       it('calls fcmSendStub with token and payload', () => {
//         expect(Object.keys(fcmSendStub.getCalls()[0].args[0])).to.have.length(2)
//         expect(fcmSendStub.getCalls()[0].args[0].token).to.equal(token)
//         expect(fcmSendStub.getCalls()[0].args[0].data).to.equal(payload)
//       })
//     })

//     describe('failure due to invalid token', () => {
//       let fcmSendStub, fcmSendMessageStub, fcmToken

//       beforeAll(async () => {
//         fcmSendStub = sinon.stub().returns(Promise.reject({
//           errorInfo: {
//             code: 'messaging/registration-token-not-registered'
//           }
//         }))

//         firebaseStub.reset()
//         firebaseStub.returns({
//           send: fcmSendStub
//         })

//         fcmSendMessageStub = sinon.stub(FCMToken, 'destroy').returns(Promise.resolve())

//         fcmToken = "token1"

//         await sendMessage(fcmToken, {})
//       })

//       afterAll(() => {
//         fcmSendMessageStub.restore()
//       })

//       it('calls fcmSendStub', () => {
//         sinon.assert.calledOnce(fcmSendStub)
//       })

//       it('calls fcmAdminMessagingStub', () => {
//         sinon.assert.calledOnce(firebaseStub)
//       })

//       it('calls destroy on fcm token', () => {
//         sinon.assert.calledOnce(fcmSendMessageStub)
//         expect(fcmSendMessageStub.getCalls()[0].args[0].where.token).to.equal(fcmToken)
//       })
//     })

//     describe('general failure', () => {
//       let fcmSendStub, fcmSendMessageStub

//       beforeAll(async () => {
//         fcmSendStub = sinon.stub().returns(Promise.reject({
//           errorInfo: {
//             code: 'messaging/internal-error'
//           }
//         }))

//         firebaseStub.reset()
//         firebaseStub.returns({
//           send: fcmSendStub
//         })

//         fcmSendMessageStub = sinon.stub(FCMToken, 'destroy').returns(Promise.resolve())

//         await sendMessage("token1", {})
//       })

//       afterAll(() => {
//         fcmSendMessageStub.restore()
//       })

//       it('calls fcmSendStub', () => {
//         sinon.assert.calledOnce(fcmSendStub)
//       })

//       it('calls fcmAdminMessagingStub', () => {
//         sinon.assert.calledOnce(firebaseStub)
//       })

//       it('does not destroy fcm token', () => {
//         sinon.assert.notCalled(fcmSendMessageStub)
//       })
//     })
//   })

//   describe('sendMessages', () => {
//     let sendMessageStub
//     beforeAll(() => {
//       sendMessageStub = sinon.stub(FirebaseService, 'sendMessage')
//     })

//     describe('success', async () => {
//       let tokens, payload

//       beforeAll(async () => {
//         sendMessageStub.reset()
//         sendMessageStub.returns(Promise.resolve())

//         tokens = ['token1', 'token2']

//         payload = {}

//         await sendMessages(tokens, payload)
//       })

//       it('calls sendMessage twice', () => {
//         sinon.assert.calledTwice(sendMessageStub)
//       })

//       it('calls sendMessage with correct tokens', () => {
//         expect(sendMessageStub.getCalls()[0].args[0]).to.equal(tokens[0])
//         expect(sendMessageStub.getCalls()[1].args[0]).to.equal(tokens[1])
//       })

//       it('calls sendMessage with correct payload', () => {
//         expect(sendMessageStub.getCalls()[0].args[1]).to.equal(payload)
//         expect(sendMessageStub.getCalls()[1].args[1]).to.equal(payload)
//       })
//     })

//     describe('failure', async () => {
//       let tokens, payload, rejected

//       beforeAll(async () => {
//         sendMessageStub.reset()
//         sendMessageStub.returns(Promise.reject())

//         tokens = ['token1', 'token2']

//         payload = {}

//         await sendMessages(tokens, payload).catch(() => {
//           rejected = true
//         })
//       })

//       it('rejects the promise', () => {
//         expect(rejected).to.be.true
//       })

//       it('calls sendMessage twice', () => {
//         sinon.assert.calledTwice(sendMessageStub)
//       })
//     })
//   })
// });
