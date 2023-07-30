import { BaseEntity, Entity, ManyToOne, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import { User } from './User';
import { v4 } from 'uuid';

@Entity({ tableName: 'StripePayments' })
export class StripePayment extends BaseEntity<StripePayment, 'id'> {

  @PrimaryKey({ columnType: 'uuid' })
  id = v4();

  @ManyToOne({ entity: () => User, fieldName: 'userId', onUpdateIntegrity: 'cascade', onDelete: 'cascade', nullable: true })
  user?: User;

  @Property({ fieldName: 'amountPaid' })
  amountPaid!: number;

  @Property({ fieldName: 'customerId', length: 255 })
  customerId!: string;

  @Property({ fieldName: 'customerEmail', length: 255, nullable: true })
  customerEmail?: string;

  @Unique({ name: 'StripePayments_paymentIntentId_key' })
  @Property({ fieldName: 'paymentIntentId', length: 255 })
  paymentIntentId!: string;

  @Property({ fieldName: 'subscriptionId', length: 255, nullable: true })
  subscriptionId?: string;

  @Property({ fieldName: 'invoiceBlob', columnType: 'jsonb' })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  invoiceBlob!: any;

  @Property({ fieldName: 'createdAt', length: 6 })
  createdAt!: Date;

  @Property({ fieldName: 'updatedAt', length: 6 })
  updatedAt!: Date;

}
