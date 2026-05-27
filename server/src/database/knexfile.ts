import dotenv from 'dotenv';
import type { Knex } from 'knex';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    migrations: {
      directory: path.resolve(__dirname, './migrations'),
      extension: 'ts',
      loadExtensions: ['.ts'],
    },
    seeds: {
      directory: path.resolve(__dirname, './seeds'),
      extension: 'ts',
      loadExtensions: ['.ts'],
    },
  },
  production: {
    client: 'pg',
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    },
    migrations: {
      directory: path.resolve(__dirname, './migrations'),
      loadExtensions: ['.js'],
    },
    seeds: {
      directory: path.resolve(__dirname, './seeds'),
      loadExtensions: ['.js'],
    },
  },
};

export default config;
