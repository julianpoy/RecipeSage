import { Sequelize, DataTypes } from 'sequelize';
import sequelizeConfig from '../config/sequelize-config.js';

const config = sequelizeConfig[process.env.NODE_ENV];

const sequelize = new Sequelize(config.database, config.username, config.password, config);

const authPromise = sequelize.authenticate();

if (process.env.NODE_ENV !== 'test') {
  authPromise.then(() => {
    console.log('Database connection established');
  }).catch((error) => {
    console.error('Unable to connect to the database:', error);
  });
}

const db = {
  modelNames: [],
};

import { FCMTokenInit } from './fcmtoken.js';
export const FCMToken = FCMTokenInit(sequelize, DataTypes);
db.modelNames.push(FCMToken.name);
db[FCMToken.name] = FCMToken;

import { FriendshipInit } from './friendship.js';
export const Friendship = FriendshipInit(sequelize, DataTypes);
db.modelNames.push(Friendship.name);
db[Friendship.name] = Friendship;

import { ImageInit } from './image.js';
export const Image = ImageInit(sequelize, DataTypes);
db.modelNames.push(Image.name);
db[Image.name] = Image;

import { LabelInit } from './label.js';
export const Label = LabelInit(sequelize, DataTypes);
db.modelNames.push(Label.name);
db[Label.name] = Label;

import { MealPlanInit } from './mealplan.js';
export const MealPlan = MealPlanInit(sequelize, DataTypes);
db.modelNames.push(MealPlan.name);
db[MealPlan.name] = MealPlan;

import { MealPlanCollaboratorInit } from './mealPlan_collaborator.js';
export const MealPlanCollaborator = MealPlanCollaboratorInit(sequelize, DataTypes);
db.modelNames.push(MealPlanCollaborator.name);
db[MealPlanCollaborator.name] = MealPlanCollaborator;

import { MealPlanItemInit } from './mealplanitem.js';
export const MealPlanItem = MealPlanItemInit(sequelize, DataTypes);
db.modelNames.push(MealPlanItem.name);
db[MealPlanItem.name] = MealPlanItem;

import { MessageInit } from './message.js';
export const Message = MessageInit(sequelize, DataTypes);
db.modelNames.push(Message.name);
db[Message.name] = Message;

import { ProfileItemInit } from './profileitem.js';
export const ProfileItem = ProfileItemInit(sequelize, DataTypes);
db.modelNames.push(ProfileItem.name);
db[ProfileItem.name] = ProfileItem;

import { RecipeInit } from './recipe.js';
export const Recipe = RecipeInit(sequelize, DataTypes);
db.modelNames.push(Recipe.name);
db[Recipe.name] = Recipe;

import { RecipeImageInit } from './recipe_image.js';
export const RecipeImage = RecipeImageInit(sequelize, DataTypes);
db.modelNames.push(RecipeImage.name);
db[RecipeImage.name] = RecipeImage;

import { RecipeLabelInit } from './recipe_label.js';
export const RecipeLabel = RecipeLabelInit(sequelize, DataTypes);
db.modelNames.push(RecipeLabel.name);
db[RecipeLabel.name] = RecipeLabel;

import { SessionInit } from './session.js';
export const Session = SessionInit(sequelize, DataTypes);
db.modelNames.push(Session.name);
db[Session.name] = Session;

import { ShoppingListInit } from './shoppinglist.js';
export const ShoppingList = ShoppingListInit(sequelize, DataTypes);
db.modelNames.push(ShoppingList.name);
db[ShoppingList.name] = ShoppingList;

import { ShoppingListCollaboratorInit } from './shoppingList_collaborator.js';
export const ShoppingListCollaborator = ShoppingListCollaboratorInit(sequelize, DataTypes);
db.modelNames.push(ShoppingListCollaborator.name);
db[ShoppingListCollaborator.name] = ShoppingListCollaborator;

import { ShoppingListItemInit } from './shoppinglistitem.js';
export const ShoppingListItem = ShoppingListItemInit(sequelize, DataTypes);
db.modelNames.push(ShoppingListItem.name);
db[ShoppingListItem.name] = ShoppingListItem;

import { StripePaymentInit } from './stripePayment.js';
export const StripePayment = StripePaymentInit(sequelize, DataTypes);
db.modelNames.push(StripePayment.name);
db[StripePayment.name] = StripePayment;

import { UserInit } from './user.js';
export const User = UserInit(sequelize, DataTypes);
db.modelNames.push(User.name);
db[User.name] = User;

import { UserProfileImageInit } from './user_profile_image.js';
export const UserProfileImage = UserProfileImageInit(sequelize, DataTypes);
db.modelNames.push(UserProfileImage.name);
db[UserProfileImage.name] = UserProfileImage;

import { UserSubscriptionInit } from './userSubscription.js';
export const UserSubscription = UserSubscriptionInit(sequelize, DataTypes);
db.modelNames.push(UserSubscription.name);
db[UserSubscription.name] = UserSubscription;

FCMToken.associate(db);
Friendship.associate(db);
Image.associate(db);
Label.associate(db);
MealPlan.associate(db);
MealPlanCollaborator.associate(db);
MealPlanItem.associate(db);
Message.associate(db);
ProfileItem.associate(db);
Recipe.associate(db);
RecipeImage.associate(db);
RecipeLabel.associate(db);
Session.associate(db);
ShoppingList.associate(db);
ShoppingListCollaborator.associate(db);
ShoppingListItem.associate(db);
StripePayment.associate(db);
User.associate(db);
UserProfileImage.associate(db);
UserSubscription.associate(db);

db.sequelize = sequelize;
db.Sequelize = Sequelize;

export default db;

