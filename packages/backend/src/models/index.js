import { Sequelize, DataTypes } from "sequelize";
import * as sequelizeConfig from "../config/sequelize-config.js";

const config = sequelizeConfig[process.env.NODE_ENV];

const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  config,
);

const authPromise = sequelize.authenticate();

if (process.env.NODE_ENV !== "test") {
  authPromise
    .then(() => {
      console.log("Database connection established");
    })
    .catch((error) => {
      console.error("Unable to connect to the database:", error);
    });
}

const db = {
  modelNames: [],
};

import { FCMTokenInit } from "./fcmtoken.js";
export const FCMToken = FCMTokenInit(sequelize, DataTypes);
db.modelNames.push(FCMToken.name);
db[FCMToken.name] = FCMToken;

import { FriendshipInit } from "./friendship.js";
export const Friendship = FriendshipInit(sequelize, DataTypes);
db.modelNames.push(Friendship.name);
db[Friendship.name] = Friendship;

import { ImageInit } from "./image.js";
export const Image = ImageInit(sequelize, DataTypes);
db.modelNames.push(Image.name);
db[Image.name] = Image;

import { LabelInit } from "./label.js";
export const Label = LabelInit(sequelize, DataTypes);
db.modelNames.push(Label.name);
db[Label.name] = Label;

import { MealPlanInit } from "./mealplan.js";
export const MealPlan = MealPlanInit(sequelize, DataTypes);
db.modelNames.push(MealPlan.name);
db[MealPlan.name] = MealPlan;

import { MealPlanCollaboratorInit } from "./mealPlan_collaborator.js";
export const MealPlan_Collaborator = MealPlanCollaboratorInit(
  sequelize,
  DataTypes,
);
db.modelNames.push(MealPlan_Collaborator.name);
db[MealPlan_Collaborator.name] = MealPlan_Collaborator;

import { MealPlanItemInit } from "./mealplanitem.js";
export const MealPlanItem = MealPlanItemInit(sequelize, DataTypes);
db.modelNames.push(MealPlanItem.name);
db[MealPlanItem.name] = MealPlanItem;

import { MessageInit } from "./message.js";
export const Message = MessageInit(sequelize, DataTypes);
db.modelNames.push(Message.name);
db[Message.name] = Message;

import { AssistantMessageInit } from "./assistantMessage.js";
export const AssistantMessage = AssistantMessageInit(sequelize, DataTypes);
db.modelNames.push(AssistantMessage.name);
db[AssistantMessage.name] = AssistantMessage;

import { ProfileItemInit } from "./profileitem.js";
export const ProfileItem = ProfileItemInit(sequelize, DataTypes);
db.modelNames.push(ProfileItem.name);
db[ProfileItem.name] = ProfileItem;

import { RecipeInit } from "./recipe.js";
export const Recipe = RecipeInit(sequelize, DataTypes);
db.modelNames.push(Recipe.name);
db[Recipe.name] = Recipe;

import { RecipeImageInit } from "./recipe_image.js";
export const Recipe_Image = RecipeImageInit(sequelize, DataTypes);
db.modelNames.push(Recipe_Image.name);
db[Recipe_Image.name] = Recipe_Image;

import { RecipeLabelInit } from "./recipe_label.js";
export const Recipe_Label = RecipeLabelInit(sequelize, DataTypes);
db.modelNames.push(Recipe_Label.name);
db[Recipe_Label.name] = Recipe_Label;

import { SessionInit } from "./session.js";
export const Session = SessionInit(sequelize, DataTypes);
db.modelNames.push(Session.name);
db[Session.name] = Session;

import { ShoppingListInit } from "./shoppinglist.js";
export const ShoppingList = ShoppingListInit(sequelize, DataTypes);
db.modelNames.push(ShoppingList.name);
db[ShoppingList.name] = ShoppingList;

import { ShoppingListCollaboratorInit } from "./shoppingList_collaborator.js";
export const ShoppingList_Collaborator = ShoppingListCollaboratorInit(
  sequelize,
  DataTypes,
);
db.modelNames.push(ShoppingList_Collaborator.name);
db[ShoppingList_Collaborator.name] = ShoppingList_Collaborator;

import { ShoppingListItemInit } from "./shoppinglistitem.js";
export const ShoppingListItem = ShoppingListItemInit(sequelize, DataTypes);
db.modelNames.push(ShoppingListItem.name);
db[ShoppingListItem.name] = ShoppingListItem;

import { StripePaymentInit } from "./stripePayment.js";
export const StripePayment = StripePaymentInit(sequelize, DataTypes);
db.modelNames.push(StripePayment.name);
db[StripePayment.name] = StripePayment;

import { UserInit } from "./user.js";
export const User = UserInit(sequelize, DataTypes);
db.modelNames.push(User.name);
db[User.name] = User;

import { UserProfileImageInit } from "./user_profile_image.js";
export const User_Profile_Image = UserProfileImageInit(sequelize, DataTypes);
db.modelNames.push(User_Profile_Image.name);
db[User_Profile_Image.name] = User_Profile_Image;

import { UserSubscriptionInit } from "./userSubscription.js";
export const UserSubscription = UserSubscriptionInit(sequelize, DataTypes);
db.modelNames.push(UserSubscription.name);
db[UserSubscription.name] = UserSubscription;

FCMToken.associate(db);
Friendship.associate(db);
Image.associate(db);
Label.associate(db);
MealPlan.associate(db);
MealPlan_Collaborator.associate(db);
MealPlanItem.associate(db);
Message.associate(db);
ProfileItem.associate(db);
Recipe.associate(db);
Recipe_Image.associate(db);
Recipe_Label.associate(db);
Session.associate(db);
ShoppingList.associate(db);
ShoppingList_Collaborator.associate(db);
ShoppingListItem.associate(db);
StripePayment.associate(db);
User.associate(db);
User_Profile_Image.associate(db);
UserSubscription.associate(db);

db.sequelize = sequelize;
db.Sequelize = Sequelize;

export const modelNames = db.modelNames;

export { sequelize, Sequelize };

export default db;
