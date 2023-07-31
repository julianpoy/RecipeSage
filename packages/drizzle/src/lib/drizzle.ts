import { drizzle } from 'drizzle-orm/postgres-js';
import * as postgres from 'postgres';

const connectionString = process.env['DATABASE_URL'];
if (!connectionString) {
  throw new Error('Must provide DATABASE_URL');
}

const client = postgres(connectionString);
export const db = drizzle(client);

