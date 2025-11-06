// Simple database browser endpoint
import express from 'express';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3001;
const dbPath = path.join(__dirname, 'driveKenya.db');

// Simple HTML template
const htmlTemplate = (title, content) => `
<!DOCTYPE html>
<html>
<head>
    <title>${title}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #4CAF50; color: white; }
        tr:nth-child(even) { background-color: #f2f2f2; }
        .nav { margin-bottom: 20px; }
        .nav a { margin-right: 15px; padding: 8px 16px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
        .nav a:hover { background: #0056b3; }
        .summary { background: #e7f3ff; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .json { background: #f8f9fa; padding: 10px; border-radius: 5px; white-space: pre-wrap; font-family: monospace; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🗄️ DriveKenya Database Browser</h1>
        <div class="nav">
            <a href="/">Summary</a>
            <a href="/users">Users</a>
            <a href="/cars">Cars</a>
            <a href="/rentals">Rentals</a>
            <a href="/reviews">Reviews</a>
            <a href="/messages">Messages</a>
        </div>
        ${content}
    </div>
</body>
</html>
`;

// Database connection
const db = new sqlite3.Database(dbPath);

// Home page with summary
app.get('/', (req, res) => {
    const queries = [
        'SELECT COUNT(*) as count FROM users',
        'SELECT COUNT(*) as count FROM cars',
        'SELECT COUNT(*) as count FROM rentals',
        'SELECT COUNT(*) as count FROM reviews',
        'SELECT COUNT(*) as count FROM messages'
    ];
    
    Promise.all(queries.map(query => 
        new Promise((resolve, reject) => {
            db.get(query, (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        })
    )).then(counts => {
        const content = `
        <div class="summary">
            <h2>📊 Database Summary</h2>
            <p><strong>👥 Users:</strong> ${counts[0]} registered</p>
            <p><strong>🚗 Cars:</strong> ${counts[1]} available</p>
            <p><strong>📋 Rentals:</strong> ${counts[2]} bookings</p>
            <p><strong>⭐ Reviews:</strong> ${counts[3]} reviews</p>
            <p><strong>💬 Messages:</strong> ${counts[4]} messages</p>
        </div>
        <p>Click on the navigation links above to view detailed data for each table.</p>
        `;
        res.send(htmlTemplate('Database Summary', content));
    }).catch(err => {
        res.send(htmlTemplate('Error', `<p>Error: ${err.message}</p>`));
    });
});

// Generic table viewer
const viewTable = (tableName) => (req, res) => {
    db.all(`SELECT * FROM ${tableName}`, (err, rows) => {
        if (err) {
            res.send(htmlTemplate('Error', `<p>Error: ${err.message}</p>`));
            return;
        }
        
        if (rows.length === 0) {
            res.send(htmlTemplate(`${tableName} Table`, `<p>No data found in ${tableName} table.</p>`));
            return;
        }
        
        const headers = Object.keys(rows[0]).map(key => `<th>${key}</th>`).join('');
        const tableRows = rows.map(row => 
            `<tr>${Object.values(row).map(val => `<td>${val || ''}</td>`).join('')}</tr>`
        ).join('');
        
        const content = `
        <h2>📋 ${tableName.toUpperCase()} Table (${rows.length} records)</h2>
        <table>
            <thead><tr>${headers}</tr></thead>
            <tbody>${tableRows}</tbody>
        </table>
        `;
        
        res.send(htmlTemplate(`${tableName} Data`, content));
    });
};

// Table routes
app.get('/users', viewTable('users'));
app.get('/cars', viewTable('cars'));
app.get('/rentals', viewTable('rentals'));
app.get('/reviews', viewTable('reviews'));
app.get('/messages', viewTable('messages'));

app.listen(port, () => {
    console.log(`🌐 Database Browser running at http://localhost:${port}`);
    console.log(`📊 View your database in the browser!`);
});