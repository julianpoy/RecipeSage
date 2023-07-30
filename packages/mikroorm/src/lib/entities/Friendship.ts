import { BaseEntity, Entity, ManyToOne, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import { User } from './User';
import { v4 } from 'uuid';

@Entity({ tableName: 'Friendships' })
@Unique({ name: 'Friendships_userId_friendId_uk', properties: ['user', 'friend'] })
export class Friendship extends BaseEntity<Friendship, 'id'> {

  @PrimaryKey({ columnType: 'uuid' })
  id = v4();

  @ManyToOne({ entity: () => User, fieldName: 'userId', onUpdateIntegrity: 'cascade', onDelete: 'cascade' })
  user!: User;

  @ManyToOne({ entity: () => User, fieldName: 'friendId', onUpdateIntegrity: 'cascade', onDelete: 'cascade' })
  friend!: User;

  @Property({ fieldName: 'createdAt', length: 6 })
  createdAt!: Date;

  @Property({ fieldName: 'updatedAt', length: 6 })
  updatedAt!: Date;

}
