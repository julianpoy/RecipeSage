import { BaseEntity, Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { Image } from './Image';
import { Recipe } from './Recipe';
import { v4 } from 'uuid';

@Entity({ tableName: 'Recipe_Images' })
export class RecipeImage extends BaseEntity<RecipeImage, 'id'> {

  @PrimaryKey({ columnType: 'uuid' })
  id = v4();

  @ManyToOne({ entity: () => Recipe, fieldName: 'recipeId', onUpdateIntegrity: 'cascade', onDelete: 'cascade', index: 'recipe__images_recipe_id' })
  recipe!: Recipe;

  @ManyToOne({ entity: () => Image, fieldName: 'imageId', onUpdateIntegrity: 'cascade', onDelete: 'cascade', index: 'recipe__images_image_id' })
  image!: Image;

  @Property()
  order!: number;

  @Property({ fieldName: 'createdAt', length: 6 })
  createdAt!: Date;

  @Property({ fieldName: 'updatedAt', length: 6 })
  updatedAt!: Date;

}
