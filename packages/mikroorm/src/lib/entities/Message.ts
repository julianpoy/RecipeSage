import { BaseEntity, Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { Recipe } from './Recipe';
import { User } from './User';
import { v4 } from 'uuid';

@Entity({ tableName: 'Messages' })
export class Message extends BaseEntity<Message, 'id'> {

  @PrimaryKey({ columnType: 'uuid' })
  id = v4();

  @ManyToOne({ entity: () => User, fieldName: 'fromUserId', onUpdateIntegrity: 'cascade', onDelete: 'cascade' })
  fromUser!: User;

  @ManyToOne({ entity: () => User, fieldName: 'toUserId', onUpdateIntegrity: 'cascade', onDelete: 'cascade' })
  toUser!: User;

  @ManyToOne({ entity: () => Recipe, fieldName: 'recipeId', onUpdateIntegrity: 'cascade', onDelete: 'set null', nullable: true, index: 'messages_recipe_id' })
  recipe?: Recipe;

  @ManyToOne({ entity: () => Recipe, fieldName: 'originalRecipeId', onUpdateIntegrity: 'cascade', onDelete: 'set null', nullable: true, index: 'messages_original_recipe_id' })
  originalRecipe?: Recipe;

  @Property({ columnType: 'text', nullable: true })
  body?: string;

  @Property({ length: 255, nullable: true })
  type?: string;

  @Property({ fieldName: 'createdAt', length: 6 })
  createdAt!: Date;

  @Property({ fieldName: 'updatedAt', length: 6 })
  updatedAt!: Date;

}
