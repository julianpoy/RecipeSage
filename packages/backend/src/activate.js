import { User } from "./models/index.js";

import * as SubscriptionService from "./services/subscriptions.js";

const email = process.argv[2];
const subName = process.argv[3];

if (!email) {
  console.error("You must provide an email address as the first argument");
  process.exit(1);
}

const run = async () => {
  const user = await User.findOne({
    where: {
      email,
    },
  });

  if (!user) return console.log("No user found with that email address");

  await SubscriptionService.extend(user.id, subName || "forever");

  console.log("\n");
  console.log("Thanks for activating RecipeSage's bonus features");
  console.log(
    "Please consider contributing to RecipeSage's development & maintenance: https://recipesage.com/#/contribute",
  );
  console.log("");
  console.log("- Julian");
  console.log("");
};

run()
  .then(() => process.exit(0))
  .catch((err) => console.error(err));
