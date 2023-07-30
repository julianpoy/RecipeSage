import { BaseEntity, Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { MealPlan } from './MealPlan';
import { User } from './User';
import { v4 } from 'uuid';

@Entity({ tableName: 'MealPlan_Collaborators' })
export class MealPlanCollaborator extends BaseEntity<MealPlanCollaborator, 'id'> {

  @PrimaryKey({ columnType: 'uuid' })
  id = v4();

  @ManyToOne({ entity: () => MealPlan, fieldName: 'mealPlanId', onUpdateIntegrity: 'cascade', onDelete: 'cascade' })
  mealPlan!: MealPlan;

  @ManyToOne({ entity: () => User, fieldName: 'userId', onUpdateIntegrity: 'cascade', onDelete: 'cascade' })
  user!: User;

  @Property({ fieldName: 'createdAt', length: 6 })
  createdAt!: Date;

  @Property({ fieldName: 'updatedAt', length: 6 })
  updatedAt!: Date;

}
