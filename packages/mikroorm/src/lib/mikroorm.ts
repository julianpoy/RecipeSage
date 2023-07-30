import { EntityManager, MikroORM, type PostgreSqlDriver } from '@mikro-orm/postgresql'; // or any other driver package
import config from '../config';

export const mikro = {} as {
  orm: MikroORM,
  em: EntityManager,
};

export const init = async () => {
  mikro.orm = await MikroORM.init<PostgreSqlDriver>(config);
  mikro.em = mikro.orm.em;
}

