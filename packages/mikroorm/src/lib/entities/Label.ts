import { BaseEntity, Entity, ManyToOne, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import { User } from './User';
import { v4 } from 'uuid';

@Entity({ tableName: 'Labels' })
@Unique({ name: 'Labels_userId_title_uk', properties: ['user', 'title'] })
export class Label extends BaseEntity<Label, 'id'> {

  @PrimaryKey({ columnType: 'uuid' })
  id = v4();

  @ManyToOne({ entity: () => User, fieldName: 'userId', onUpdateIntegrity: 'cascade', onDelete: 'cascade' })
  user!: User;

  @Property({ length: 255, nullable: true })
  title?: string;

  @Property({ fieldName: 'createdAt', length: 6 })
  createdAt!: Date;

  @Property({ fieldName: 'updatedAt', length: 6 })
  updatedAt!: Date;

}
