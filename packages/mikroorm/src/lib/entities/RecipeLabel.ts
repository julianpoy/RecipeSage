import { BaseEntity, Entity, ManyToOne, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import { Label } from './Label';
import { Recipe } from './Recipe';
import { v4 } from 'uuid';

@Entity({ tableName: 'Recipe_Labels' })
@Unique({ name: 'Recipe_Labels_labelId_recipeId_uk', properties: ['label', 'recipe'] })
export class RecipeLabel extends BaseEntity<RecipeLabel, 'id'> {

  @PrimaryKey({ columnType: 'uuid' })
  id = v4();

  @ManyToOne({ entity: () => Recipe, fieldName: 'recipeId', onUpdateIntegrity: 'cascade', onDelete: 'cascade', index: 'recipe__labels_recipe_id' })
  recipe!: Recipe;

  @ManyToOne({ entity: () => Label, fieldName: 'labelId', onUpdateIntegrity: 'cascade', onDelete: 'cascade', index: 'recipe__labels_label_id' })
  label!: Label;

  @Property({ fieldName: 'createdAt', length: 6 })
  createdAt!: Date;

  @Property({ fieldName: 'updatedAt', length: 6 })
  updatedAt!: Date;

}
