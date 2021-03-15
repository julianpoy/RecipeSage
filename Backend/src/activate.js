const Sequelize = require('sequelize');
const path = require('path');

const User = require('./models').User;

const subscriptionService = require('./services/subscriptions');

const email = process.argv[1];
const subName = process.argv[2];

if (!email) return console.log("You must provide an email address as the first argument");

const run = async () => {
  const user = await User.findOne({
    where: {
      email
    }
  });

  if (!user) return console.log("No user found with that email address");

  await subscriptionService.extend(user.id, subName || "forever");

  console.log("\n");
  console.log("Thanks for activating RecipeSage's bonus features");
  console.log("Please consider contributing to RecipeSage's development & maintenance: https://recipesage.com/#/contribute");
  console.log("");
  console.log("- Julian");
  console.log("");
};

run()
  .then(() => process.exit(0))
  .catch(err => console.error(err));
