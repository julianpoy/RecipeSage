import { BaseEntity, Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { User } from './User';
import { v4 } from 'uuid';

@Entity({ tableName: 'UserSubscriptions' })
export class UserSubscription extends BaseEntity<UserSubscription, 'id'> {

  @PrimaryKey({ columnType: 'uuid' })
  id = v4();

  @ManyToOne({ entity: () => User, fieldName: 'userId', onUpdateIntegrity: 'cascade', onDelete: 'cascade' })
  user!: User;

  @Property({ length: 255, nullable: true })
  name?: string;

  @Property({ length: 6, nullable: true })
  expires?: Date;

  @Property({ fieldName: 'createdAt', length: 6 })
  createdAt!: Date;

  @Property({ fieldName: 'updatedAt', length: 6 })
  updatedAt!: Date;

}
