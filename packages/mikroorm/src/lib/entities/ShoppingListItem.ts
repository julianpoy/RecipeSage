import { BaseEntity, Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { MealPlanItem } from './MealPlanItem';
import { Recipe } from './Recipe';
import { ShoppingList } from './ShoppingList';
import { User } from './User';
import { v4 } from 'uuid';

@Entity({ tableName: 'ShoppingListItems' })
export class ShoppingListItem extends BaseEntity<ShoppingListItem, 'id'> {

  @PrimaryKey({ columnType: 'uuid' })
  id = v4();

  @ManyToOne({ entity: () => User, fieldName: 'userId', onUpdateIntegrity: 'cascade', onDelete: 'cascade' })
  user!: User;

  @ManyToOne({ entity: () => ShoppingList, fieldName: 'shoppingListId', onUpdateIntegrity: 'cascade', onDelete: 'cascade', index: 'shopping_list_items_shopping_list_id' })
  shoppingList!: ShoppingList;

  @ManyToOne({ entity: () => MealPlanItem, fieldName: 'mealPlanItemId', onUpdateIntegrity: 'cascade', onDelete: 'cascade', nullable: true })
  mealPlanItem?: MealPlanItem;

  @ManyToOne({ entity: () => Recipe, fieldName: 'recipeId', onUpdateIntegrity: 'cascade', onDelete: 'cascade', nullable: true, index: 'shopping_list_items_recipe_id' })
  recipe?: Recipe;

  @Property({ columnType: 'text' })
  title!: string;

  @Property()
  completed!: boolean;

  @Property({ fieldName: 'createdAt', length: 6 })
  createdAt!: Date;

  @Property({ fieldName: 'updatedAt', length: 6 })
  updatedAt!: Date;

}
