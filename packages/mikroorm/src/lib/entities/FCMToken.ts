import { BaseEntity, Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { User } from './User';
import { v4 } from 'uuid';

@Entity({ tableName: 'FCMTokens' })
export class FCMToken extends BaseEntity<FCMToken, 'id'> {

  @PrimaryKey({ columnType: 'uuid' })
  id = v4();

  @ManyToOne({ entity: () => User, fieldName: 'userId', onUpdateIntegrity: 'cascade', onDelete: 'cascade' })
  user!: User;

  @Property({ columnType: 'text', nullable: true })
  token?: string;

  @Property({ fieldName: 'createdAt', length: 6 })
  createdAt!: Date;

  @Property({ fieldName: 'updatedAt', length: 6 })
  updatedAt!: Date;

}
