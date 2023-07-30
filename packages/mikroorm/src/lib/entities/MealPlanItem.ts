import { BaseEntity, Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { MealPlan } from './MealPlan';
import { Recipe } from './Recipe';
import { User } from './User';
import { v4 } from 'uuid';

@Entity({ tableName: 'MealPlanItems' })
export class MealPlanItem extends BaseEntity<MealPlanItem, 'id'> {

  @PrimaryKey({ columnType: 'uuid' })
  id = v4();

  @ManyToOne({ entity: () => User, fieldName: 'userId', onUpdateIntegrity: 'cascade', onDelete: 'cascade' })
  user!: User;

  @ManyToOne({ entity: () => MealPlan, fieldName: 'mealPlanId', onUpdateIntegrity: 'cascade', onDelete: 'cascade', index: 'meal_plan_items_meal_plan_id' })
  mealPlan!: MealPlan;

  @ManyToOne({ entity: () => Recipe, fieldName: 'recipeId', onUpdateIntegrity: 'cascade', onDelete: 'cascade', nullable: true, index: 'meal_plan_items_recipe_id' })
  recipe?: Recipe;

  @Property({ columnType: 'text', nullable: true })
  title?: string;

  @Property({ length: 6, nullable: true })
  scheduled?: Date;

  @Property({ length: 255, nullable: true })
  meal?: string;

  @Property({ fieldName: 'createdAt', length: 6 })
  createdAt!: Date;

  @Property({ fieldName: 'updatedAt', length: 6 })
  updatedAt!: Date;

}
