
import { dbType, dbHost, dbPort, dbName, dbUser } from './config/env.js';
import db from './config/database.js';

console.log('--- DEBUG INFO ---');
console.log(`DB_TYPE: ${dbType}`);
console.log(`DB_HOST: ${dbHost}`);
console.log(`DB_PORT: ${dbPort}`);

try {
    console.log('Attempting DB query...');
    const result = db.prepare('SELECT 1 as val').get();
    console.log('DB Connection SUCCESS:', result);
} catch (error) {
    console.error('DB Connection FAILED:', error);
}
