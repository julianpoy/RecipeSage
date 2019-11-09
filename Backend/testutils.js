let {
  expect
} = require('chai');

const uuid = require('uuid/v4');

var Op = require("sequelize").Op;
var SQ = require('./models').sequelize;
var User = require('./models').User;
var FCMToken = require('./models').FCMToken;
var Session = require('./models').Session;
var Recipe = require('./models').Recipe;
var Label = require('./models').Label;
var Message = require('./models').Message;

const { exec } = require('child_process');

let migrate = async (down) => {
  await new Promise((resolve, reject) => {
    let command = './node_modules/.bin/sequelize db:migrate';
    if (down) command = './node_modules/.bin/sequelize db:migrate:undo:all';

    const migrate = exec(
      command,
      { env: process.env },
      (err, stdout, stderr) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );

    // Forward stdout+stderr to this process
    // migrate.stdout.pipe(process.stdout);
    migrate.stderr.pipe(process.stderr);
  })
}

module.exports.syncDB = async () => {
  await SQ.sync({ force: true });
}

module.exports.setup = async () => {
  await migrate();
  return require('./bin/www');
}

module.exports.cleanup = async (server) => {
  await migrate(true);
  await new Promise(r => server.close(() => { r() }));
}

function randomString(len) {
  let chars = 'abcdefghijklmnopqrstuvwxyz';

  let str = [];
  for (var i = 0; i < len; i++) str.push(chars.charAt(Math.floor(Math.random() * (chars.length-1))));

  return str.join('');
}
module.exports.randomString = randomString;

function randomEmail() {
  return `${randomString(20)}@gmail.com`
}
module.exports.randomEmail = randomEmail;

module.exports.createUser = () => {
  return User.create({
    name: `${randomString(10)} ${randomString(10)}`,
    email: randomEmail(),
    passwordHash: 'SaVNC9ubXV8BHykB2wAD0mhxPwh/W7O7Rz+qRy/PeV+GeeakLzkv2TSghPQvLTe07b7TqxdsRUt39lC3RaaWmhORkVS9UbtEIh9dzvcbj9VzHA0ex0k97nv0lE56Jh6D6M5Laxe2BrkpiUibP3yCDCk75vCHtLGTZVjqtabTGheIs/QwiD72C7H+bK4QSL2RYSOEbB0wysNAC5nF8r1m36FB/DS5wEixOWiQH470H1s9yHODAALNag9Lom+It4P3cMSSa83mxPNvFOniEpuDDcI5W/Oxef/XiA3EhMLL8n4+CSV1Z891g65U7j7RIKSCjK1LbCvQ5JuS/jZCErNBW9472TXdGKGeYY6RTDgSBzqISyxlMCSRBsNjToWHJyPEyEbt0BTSjTkliB+0wSQpdzUiDDiJNrLVimAriH/AcU/eFvpU5YyyY1coY8Kc80LxKxP/p881Q0DABCmaRcDH+/1iEz3SoWNvSsw/Xq8u9LcgKCjccDoD8tKBDkMijS7TBPu9zJd2nUqblPO+KTGz7hVqh/u0VQ+xEdvRQuKSc+4OnUtQRVCAFQGB99hfXfQvffeGosNy3BABEuZkobaUgs8m8RTaRFGqy8qk6BYw1bk5I5KjjmA8GNOtNHlKQ+1EZO83pIKbG61Jfm93FJ6CsWji9fXsxaBsv+JNBhRgmUw=',
    passwordSalt: 'dM4YXu5N5XY4c0LXnf30vtshh7dgsBYZ/5pZockgcJofPkWhMOplVAoWKhyqODZhO3mSUBqMqo3kXC2+7fOMt1NFB0Q1iRcJ4zaqAqdTenyjXu7rJ8WpgR1qnTcnpP8g/frQ+sk8Kcv49OC84R3v+FD8RrGm0rz8dDt7m7c/+Rw=',
    passwordVersion: 2
  });
}

module.exports.createSession = userId => {
  var today = new Date();
  var tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  return Session.create({
    userId,
    token: randomString(40),
    type: 'user',
    expires: tomorrow
  });
}

module.exports.createRecipe = (userId, folder, fromUserId) => {
  return Recipe.create({
    userId,
    fromUserId: fromUserId,
    title: randomString(20),
    description: randomString(20),
    yield: randomString(20),
    activeTime: randomString(20),
    totalTime: randomString(20),
    source: randomString(20),
    url: randomString(20),
    notes: randomString(20),
    ingredients: randomString(20),
    instructions: randomString(20),
    folder: folder || 'main'
  })
}

module.exports.createLabel = userId => {
  return Label.findOrCreate({
    where: {
      userId: userId,
      title: randomString(20)
    }
  }).then(function (labels) {
    return labels[0];
  });
}

module.exports.associateLabel = (labelId, recipeId) => {
  return Label.findByPk(labelId).then(label => {
    return label.addRecipe(recipeId);
  })
}

module.exports.createMessage = (fromUserId, toUserId, recipeId, originalRecipeId) => {
  return Message.create({
    fromUserId,
    toUserId,
    recipeId,
    originalRecipeId,
    body: recipeId ? '' : randomString(40)
  })
}

// Validates that fields match but we are not sending any additional private data
module.exports.secureUserMatch = (userHash, user) => {
  expect(userHash.id).to.equal(user.id)
  expect(userHash.name).to.equal(user.name)
  expect(userHash.email).to.equal(user.email)

  expect(Object.keys(userHash).length).to.equal(3)
}

// Validates that fields match but we are not sending any additional private data
module.exports.secureRecipeMatch = (recipeHash, recipe) => {
  expect(recipeHash.id).to.equal(recipe.id)
  expect(recipeHash.title).to.equal(recipe.title)
  expect(recipeHash.image).not.to.be.undefined

  expect(Object.keys(recipeHash).length).to.equal(3)
}

module.exports.randomUuid = () => {
  return uuid();
}
