import { BaseEntity, Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { Image } from './Image';
import { User } from './User';
import { v4 } from 'uuid';

@Entity({ tableName: 'User_Profile_Images' })
export class UserProfileImage extends BaseEntity<UserProfileImage, 'id'> {

  @PrimaryKey({ columnType: 'uuid' })
  id = v4();

  @ManyToOne({ entity: () => User, fieldName: 'userId', onUpdateIntegrity: 'cascade', onDelete: 'cascade' })
  user!: User;

  @ManyToOne({ entity: () => Image, fieldName: 'imageId', onUpdateIntegrity: 'cascade', onDelete: 'cascade' })
  image!: Image;

  @Property()
  order!: number;

  @Property({ fieldName: 'createdAt', length: 6 })
  createdAt!: Date;

  @Property({ fieldName: 'updatedAt', length: 6 })
  updatedAt!: Date;

}
