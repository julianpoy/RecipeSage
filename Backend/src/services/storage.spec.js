let {
  expect
} = require('chai');

let sinon = require('sinon');
let path = require('path');

let {
  randomString,
} = require('../testutils');
let {
  formatImageResponse,
  sendURLToStorage,
  sendFileToStorage
} = require('./storage');

const StorageService = require('./storage');
const UtilService = require('./util');
describe('formatImageResponse', () => {
  it('returns formatted image object', () => {
    let key = 's3key';
    let mimetype = 'mimetype/mimetype';
    let size = 200000;
    let etag = randomString(20);
    let img = formatImageResponse(key, mimetype, size, etag);

    expect(img.fieldname).to.equal('image');
    expect(img.originalname).to.equal('recipe-sage-img.jpg');
    expect(img.mimetype).to.equal(mimetype);
    expect(img.size).to.equal(size);
    expect(img.bucket).to.be.an.string;
    expect(img.key).to.equal(key);
    expect(img.acl).to.equal('public-read');
    expect(img.metadata.fieldName).to.equal('image');

    expect(img.location).to.be.an.string;

    expect(img.location).to.contain('https://');


    expect(img.etag).to.equal(etag);
  });
});

describe('sendURLToStorage', () => {
  let fetchImageStub,
    convertImageStub,
    sendBufferToStorageStub,
    formatImageResponseStub,
    etag,
    key,
    contentBody,
    convertedBuffer,
    formattedS3Response;

  beforeAll(() => {
    contentBody = randomString(20);
    convertedBuffer = randomString(20);

    fetchImageStub = sinon.stub(UtilService, 'fetchImage').returns(Promise.resolve(contentBody));

    convertImageStub = sinon.stub(UtilService, 'convertImage').returns(Promise.resolve(convertedBuffer));

    etag = randomString(20);
    key = randomString(20);

    sendBufferToStorageStub = sinon.stub(StorageService, 'sendBufferToStorage').returns(Promise.resolve({
      ETag: etag,
      key
    }));

    formattedS3Response = {
      fieldname: 'image',
      originalname: 'recipe-sage-img.jpg',
      mimetype: 'image/jpeg',
      size: 20,
      bucket: 'BUCKET',
      key: 'key here',
      acl: 'public-read',
      metadata: {
        fieldName: 'image'
      },
      location: 'https://BUCKET.s3.REGION.amazonaws.com/KEY',
      etag
    };

    formatImageResponseStub = sinon.stub(StorageService, 'formatImageResponse').returns(Promise.resolve(formattedS3Response));
  });

  afterAll(() => {
    fetchImageStub.restore();
    convertImageStub.restore();
    sendBufferToStorageStub.restore();
    formatImageResponseStub.restore();
  });

  it('copies url to s3 bucket', () => {
    let fakeURL = randomString(20);
    return sendURLToStorage(fakeURL).then(result => {
      sinon.assert.calledOnce(fetchImageStub);
      sinon.assert.calledWith(fetchImageStub, fakeURL);

      sinon.assert.calledOnce(convertImageStub);
      sinon.assert.calledWith(convertImageStub, contentBody);

      sinon.assert.calledOnce(sendBufferToStorageStub);
      sinon.assert.calledWith(sendBufferToStorageStub, convertedBuffer);

      sinon.assert.calledOnce(formatImageResponseStub);
      sinon.assert.calledWith(formatImageResponseStub, key, 'image/jpeg', 20, etag);

      expect(result).to.equal(formattedS3Response);
    });
  });
});

describe('sendFileToStorage', () => {
  let sendBufferToStorageStub,
    formatImageResponseStub,
    convertImageStub,
    contentLength,
    etag,
    key,
    convertedBody,
    formattedS3Response,
    result;

  beforeAll(async () => {
    contentLength = randomString(20);

    // We are not mocking fs calls here due to an issue with fs and sinon

    etag = randomString(20);
    key = randomString(20);
    convertedBody = randomString(20);

    convertImageStub = sinon.stub(UtilService, 'convertImage').returns(Promise.resolve(convertedBody));

    sendBufferToStorageStub = sinon.stub(StorageService, 'sendBufferToStorage').returns(Promise.resolve({
      ETag: etag,
      key
    }));

    formattedS3Response = {
      fieldname: 'image',
      originalname: 'recipe-sage-img.jpg',
      mimetype: 'image/jpeg',
      size: contentLength,
      bucket: 'BUCKET',
      key: 'key here',
      acl: 'public-read',
      metadata: {
        fieldName: 'image'
      },
      location: 'https://BUCKET.s3.REGION.amazonaws.com/KEY',
      etag
    };

    formatImageResponseStub = sinon.stub(StorageService, 'formatImageResponse').returns(Promise.resolve(formattedS3Response));

    let exampleFilePath = path.join(__dirname, '../test/exampleFiles/img1.png');
    result = await sendFileToStorage(exampleFilePath);
  });

  afterAll(() => {
    convertImageStub.restore();
    sendBufferToStorageStub.restore();
    formatImageResponseStub.restore();
  });

  it('copies url to s3 bucket', () => {
    sinon.assert.calledOnce(convertImageStub);

    sinon.assert.calledOnce(sendBufferToStorageStub);

    sinon.assert.calledOnce(formatImageResponseStub);
    // 4324 is magic num of our test file size
    sinon.assert.calledWith(formatImageResponseStub, key, 'image/jpeg', 4324, etag);

    expect(result).to.equal(formattedS3Response);
  });
});

describe('sendBufferToStorage', () => {
  // let s3PutObjectStub, s3PutObjectPromiseStub, fakeBody, result, etag

  // beforeAll(async () => {
  //   etag = randomString(20)

  //   s3PutObjectPromiseStub = sinon.stub().returns(Promise.resolve({
  //     ETag: etag
  //   }));

  //   s3PutObjectStub = sinon.stub(aws.S3.prototype, 'putObject').returns({
  //     promise: s3PutObjectStub
  //   });

  //   fakeBody = randomString(20)

  //   result = await sendBufferToStorage(fakeBody)
  // })

  // afterAll(() => {
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
});
