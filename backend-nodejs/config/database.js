import env from './env.js';
import * as sqlite from './database-sqlite.js';
import * as postgres from './database-postgres.js';

const isPostgres = env.dbType === 'postgres';
const dbDriver = isPostgres ? postgres : sqlite;

console.log(`🔌 Database Gateway: Using ${isPostgres ? 'PostgreSQL' : 'SQLite'}`);

// Export common interface
export const query = dbDriver.query;
export const transaction = dbDriver.transaction;
export const createTables = dbDriver.createTables;

// Provide access to the raw pool/db object if needed
export const db = isPostgres ? postgres.pool : sqlite.default;

export default db;