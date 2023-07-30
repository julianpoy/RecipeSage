import { BaseEntity, Collection, Entity, OneToMany, OptionalProps, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import { v4 } from 'uuid';
import { Recipe } from './Recipe';
import { UserProfileImage } from './UserProfileImage';
import { FCMToken } from './FCMToken';
import { Friendship } from './Friendship';
import { MealPlan } from './MealPlan';
import { MealPlanItem } from './MealPlanItem';
import { ProfileItem } from './ProfileItem';
import { Session } from './Session';
import { ShoppingList } from './ShoppingList';
import { ShoppingListItem } from './ShoppingListItem';
import { StripePayment } from './StripePayment';
import { UserSubscription } from './UserSubscription';

@Entity({ tableName: 'Users' })
export class User extends BaseEntity<User, 'id'> {

  [OptionalProps]?: 'enableProfile';

  @PrimaryKey({ columnType: 'uuid' })
  id = v4();

  @Property({ columnType: 'text', nullable: true })
  name?: string;

  @Unique({ name: 'Users_email_uk' })
  @Property({ columnType: 'text', nullable: true })
  email?: string;

  @Property({ fieldName: 'passwordHash', columnType: 'text', nullable: true })
  passwordHash?: string;

  @Property({ fieldName: 'passwordSalt', columnType: 'text', nullable: true })
  passwordSalt?: string;

  @Property({ fieldName: 'passwordVersion', nullable: true })
  passwordVersion?: number;

  @Property({ fieldName: 'lastLogin', length: 6, nullable: true })
  lastLogin?: Date;

  @Property({ fieldName: 'createdAt', length: 6 })
  createdAt!: Date;

  @Property({ fieldName: 'updatedAt', length: 6 })
  updatedAt!: Date;

  @Unique({ name: 'Users_stripeCustomerId_key' })
  @Property({ fieldName: 'stripeCustomerId', length: 255, nullable: true })
  stripeCustomerId?: string;

  @Unique({ name: 'Users_handle_uk' })
  @Property({ length: 255, nullable: true })
  handle?: string;

  @Property({ fieldName: 'enableProfile', default: false })
  enableProfile = false;

  @Property({ fieldName: 'profileVisibility', length: 255, nullable: true })
  profileVisibility?: string;

  @OneToMany({ entity: 'FCMToken', mappedBy: 'user' })
  fcmTokens = new Collection<FCMToken>(this);

  @OneToMany({ entity: 'Friendship', mappedBy: 'friend' })
  incomingFriendships = new Collection<Friendship>(this);

  @OneToMany({ entity: 'Friendship', mappedBy: 'user' })
  outgoingFriendships = new Collection<Friendship>(this);

  @OneToMany({ entity: 'MealPlan', mappedBy: 'user' })
  mealPlans = new Collection<MealPlan>(this);

  @OneToMany({ entity: 'MealPlanItem', mappedBy: 'user' })
  mealPlanItems = new Collection<MealPlanItem>(this);

  @OneToMany({ entity: 'ProfileItem', mappedBy: 'user' })
  profileItems = new Collection<ProfileItem>(this);

  @OneToMany({ entity: 'Recipe', mappedBy: 'user' })
  recipes = new Collection<Recipe>(this);

  @OneToMany({ entity: 'Session', mappedBy: 'user' })
  sessions = new Collection<Session>(this);

  @OneToMany({ entity: 'ShoppingList', mappedBy: 'user' })
  shoppingLists = new Collection<ShoppingList>(this);

  @OneToMany({ entity: 'ShoppingListItem', mappedBy: 'user' })
  shoppingListItems = new Collection<ShoppingListItem>(this);

  @OneToMany({ entity: 'StripePayment', mappedBy: 'user' })
  stripePayments = new Collection<StripePayment>(this);

  @OneToMany({ entity: 'UserProfileImage', mappedBy: 'user' })
  profileImages = new Collection<UserProfileImage>(this);

  @OneToMany({ entity: 'UserSubscription', mappedBy: 'user' })
  subscriptions = new Collection<UserSubscription>(this);

}
