import { BaseEntity, Collection, Entity, Index, ManyToOne, OneToMany, OptionalProps, PrimaryKey, Property } from '@mikro-orm/core';
import { User } from './User';
import { v4 } from 'uuid';
import { RecipeLabel } from './RecipeLabel';
import { RecipeImage } from './RecipeImage';

@Entity({ tableName: 'Recipes' })
export class Recipe extends BaseEntity<Recipe, 'id'> {

  [OptionalProps]?: 'userId' | 'fromUserId';

  @PrimaryKey({ columnType: 'uuid' })
  id = v4();

  @ManyToOne({ entity: () => User, fieldName: 'userId', onUpdateIntegrity: 'cascade', onDelete: 'cascade', index: 'recipes_user_id', mapToPk: true })
  user!: User;

  @Property({ persist: false })
  userId!: string;

  @ManyToOne({ entity: () => User, fieldName: 'fromUserId', onUpdateIntegrity: 'cascade', onDelete: 'set null', nullable: true, index: 'recipes_from_user_id', mapToPk: true })
  fromUser?: User;

  @Property({ persist: false })
  fromUserId?: string;

  @Property({ length: 255, nullable: true })
  title?: string;

  @Property({ columnType: 'text', nullable: true })
  description?: string;

  @Property({ columnType: 'text', nullable: true })
  yield?: string;

  @Property({ fieldName: 'activeTime', columnType: 'text', nullable: true })
  activeTime?: string;

  @Property({ fieldName: 'totalTime', columnType: 'text', nullable: true })
  totalTime?: string;

  @Property({ columnType: 'text', nullable: true })
  source?: string;

  @Property({ columnType: 'text', nullable: true })
  url?: string;

  @Property({ columnType: 'text', nullable: true })
  notes?: string;

  @Property({ columnType: 'text', nullable: true })
  ingredients?: string;

  @Property({ columnType: 'text', nullable: true })
  instructions?: string;

  @Property({ length: 255, nullable: true })
  folder?: string;

  @Property({ fieldName: 'createdAt', length: 6 })
  createdAt!: Date;

  @Property({ fieldName: 'updatedAt', length: 6 })
  updatedAt!: Date;

  @Property({ fieldName: 'indexedAt', length: 6, nullable: true })
  indexedAt?: Date;

  @Property({ nullable: true })
  rating?: number;

  @OneToMany({ entity: 'RecipeLabel', mappedBy: 'recipe' })
  recipeLabels = new Collection<RecipeLabel>(this);

  @OneToMany({ entity: 'RecipeImage', mappedBy: 'recipe' })
  recipeImages = new Collection<RecipeImage>(this);

}
