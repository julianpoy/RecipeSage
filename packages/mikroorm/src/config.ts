import { Options } from '@mikro-orm/core';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import { resolve } from 'path';
import { FCMToken } from './lib/entities/FCMToken';
import { Friendship } from './lib/entities/Friendship';
import { Image } from './lib/entities/Image';
import { Label } from './lib/entities/Label';
import { MealPlan } from './lib/entities/MealPlan';
import { MealPlanCollaborator } from './lib/entities/MealPlanCollaborator';
import { MealPlanItem } from './lib/entities/MealPlanItem';
import { Message } from './lib/entities/Message';
import { ProfileItem } from './lib/entities/ProfileItem';
import { Recipe } from './lib/entities/Recipe';
import { RecipeImage } from './lib/entities/RecipeImage';
import { RecipeLabel } from './lib/entities/RecipeLabel';
import { Session } from './lib/entities/Session';
import { ShoppingList } from './lib/entities/ShoppingList';
import { ShoppingListCollaborator } from './lib/entities/ShoppingListCollaborator';
import { ShoppingListItem } from './lib/entities/ShoppingListItem';
import { StripePayment } from './lib/entities/StripePayment';
import { User } from './lib/entities/User';
import { UserProfileImage } from './lib/entities/UserProfileImage';
import { UserSubscription } from './lib/entities/UserSubscription';

const entities = [
  FCMToken,
  Friendship,
  Image,
  Label,
  MealPlan,
  MealPlanCollaborator,
  MealPlanItem,
  Message,
  ProfileItem,
  Recipe,
  RecipeImage,
  RecipeLabel,
  Session,
  ShoppingList,
  ShoppingListCollaborator,
  ShoppingListItem,
  StripePayment,
  User,
  UserProfileImage,
  UserSubscription
];

const config: Options<PostgreSqlDriver> = {
  metadataProvider: TsMorphMetadataProvider,
  entities,
  clientUrl: process.env['DATABASE_URL'],
  type: 'postgresql',
  baseDir: resolve(__dirname, '../'),
  debug: process.env['NODE_ENV'] === 'development',
  forceUndefined: true,
};

export default config;

