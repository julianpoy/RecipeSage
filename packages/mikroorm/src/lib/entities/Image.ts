import { BaseEntity, Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { User } from './User';
import { v4 } from 'uuid';

@Entity({ tableName: 'Images' })
export class Image extends BaseEntity<Image, 'id'> {

  @PrimaryKey({ columnType: 'uuid' })
  id = v4();

  @ManyToOne({ entity: () => User, fieldName: 'userId', onUpdateIntegrity: 'cascade', onDelete: 'cascade', index: 'images_user_id' })
  user!: User;

  @Property({ length: 255, nullable: true })
  location?: string;

  @Property({ length: 255, nullable: true })
  key?: string;

  @Property({ columnType: 'jsonb', nullable: true })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  json?: any;

  @Property({ fieldName: 'createdAt', length: 6 })
  createdAt!: Date;

  @Property({ fieldName: 'updatedAt', length: 6 })
  updatedAt!: Date;

}
