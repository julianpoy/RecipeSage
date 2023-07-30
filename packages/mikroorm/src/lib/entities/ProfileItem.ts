import { BaseEntity, Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { Label } from './Label';
import { Recipe } from './Recipe';
import { User } from './User';
import { v4 } from 'uuid';

@Entity({ tableName: 'ProfileItems' })
export class ProfileItem extends BaseEntity<ProfileItem, 'id'> {

  @PrimaryKey({ columnType: 'uuid' })
  id = v4();

  @ManyToOne({ entity: () => User, fieldName: 'userId', onUpdateIntegrity: 'cascade', onDelete: 'cascade' })
  user!: User;

  @ManyToOne({ entity: () => Recipe, fieldName: 'recipeId', onUpdateIntegrity: 'cascade', onDelete: 'cascade', nullable: true })
  recipe?: Recipe;

  @ManyToOne({ entity: () => Label, fieldName: 'labelId', onUpdateIntegrity: 'cascade', onDelete: 'cascade', nullable: true })
  label?: Label;

  @Property({ length: 255 })
  title!: string;

  @Property({ length: 255 })
  type!: string;

  @Property({ length: 255 })
  visibility!: string;

  @Property()
  order!: number;

  @Property({ fieldName: 'createdAt', length: 6 })
  createdAt!: Date;

  @Property({ fieldName: 'updatedAt', length: 6 })
  updatedAt!: Date;

}
