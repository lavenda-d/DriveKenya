// Run Database Migrations on driveKenya.db
// This script runs all SQL migrations in the migrations folder

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'driveKenya.db'); // Changed from database.db
const migrationsPath = path.join(__dirname, 'migrations');

console.log('📦 Running database migrations...');
console.log('Database:', dbPath);
console.log('Migrations folder:', migrationsPath);

try {
    const db = new Database(dbPath);

    // Get all .sql files in migrations folder
    const migrationFiles = fs.readdirSync(migrationsPath)
        .filter(file => file.endsWith('.sql'))
        .sort(); // Run in alphabetical order

    console.log(`\nFound ${migrationFiles.length} migration file(s):\n`);

    migrationFiles.forEach((file, index) => {
        console.log(`${index + 1}. Running: ${file}`);

        const filePath = path.join(migrationsPath, file);
        const sql = fs.readFileSync(filePath, 'utf8');

        try {
            // Execute the SQL (can contain multiple statements)
            db.exec(sql);
            console.log(`   ✅ Success\n`);
        } catch (error) {
            // Check if it's just a "table/column already exists" error
            if (error.message.includes('already exists') || error.message.includes('duplicate column')) {
                console.log(`   ⚠️  Already exists (skipping)\n`);
            } else {
                console.error(`   ❌ Error: ${error.message}\n`);
            }
        }
    });

    db.close();
    console.log('✅ All migrations completed!');
    console.log('\n💡 Restart your backend server to apply changes.');

} catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
}
