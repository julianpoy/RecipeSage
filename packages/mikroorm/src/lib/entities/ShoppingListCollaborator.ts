import { BaseEntity, Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { ShoppingList } from './ShoppingList';
import { User } from './User';
import { v4 } from 'uuid';

@Entity({ tableName: 'ShoppingList_Collaborators' })
export class ShoppingListCollaborator extends BaseEntity<ShoppingListCollaborator, 'id'> {

  @PrimaryKey({ columnType: 'uuid' })
  id = v4();

  @ManyToOne({ entity: () => ShoppingList, fieldName: 'shoppingListId', onUpdateIntegrity: 'cascade', onDelete: 'cascade' })
  shoppingList!: ShoppingList;

  @ManyToOne({ entity: () => User, fieldName: 'userId', onUpdateIntegrity: 'cascade', onDelete: 'cascade' })
  user!: User;

  @Property({ fieldName: 'createdAt', length: 6 })
  createdAt!: Date;

  @Property({ fieldName: 'updatedAt', length: 6 })
  updatedAt!: Date;

}
