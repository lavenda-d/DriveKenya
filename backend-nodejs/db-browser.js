// Database browser for DriveKenya
import express from 'express';
import Database from 'better-sqlite3';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Email configuration
const mailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  } : undefined,
});

// Helper function to send email notification
async function sendTicketReplyEmail(userEmail, userName, ticketId, ticketSubject, replyMessage) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'support@drivekenya.com',
      to: userEmail,
      subject: `Re: ${ticketSubject} (Ticket #${ticketId})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">DriveKenya Support</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333;">Hello ${userName},</h2>
            <p style="color: #666; line-height: 1.6;">
              We've responded to your support ticket <strong>#${ticketId}</strong>: "${ticketSubject}"
            </p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <p style="color: #333; margin: 0; white-space: pre-wrap;">${replyMessage}</p>
            </div>
            <p style="color: #666; line-height: 1.6;">
              If you have any additional questions, please reply to this email or check your ticket status in your account.
            </p>
            <div style="text-align: center; margin-top: 30px;">
              <a href="http://localhost:3000" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                View in Dashboard
              </a>
            </div>
          </div>
          <div style="background: #333; color: #999; padding: 20px; text-align: center; font-size: 12px;">
            <p>© 2025 DriveKenya. All rights reserved.</p>
            <p>This is an automated message from our support system.</p>
          </div>
        </div>
      `,
      text: `Hello ${userName},\n\nWe've responded to your support ticket #${ticketId}: "${ticketSubject}"\n\n${replyMessage}\n\nIf you have any additional questions, please reply to this email or check your ticket status in your account.\n\nBest regards,\nDriveKenya Support Team`
    };

    await mailTransporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${userEmail} for ticket #${ticketId}`);
    return true;
  } catch (error) {
    console.error('❌ Email send error:', error.message);
    return false;
  }
}

const app = express();
const port = 3001;
const dbPath = path.join(__dirname, 'driveKenya.db');
const db = new Database(dbPath, { verbose: console.log });

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Simple HTML template with improved styling
const htmlTemplate = (title, content) => `
<!DOCTYPE html>
<html>
<head>
    <title>${title} | DriveKenya DB Browser</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <style>
        .table-container { max-height: 70vh; overflow-y: auto; }
        .nav-link { transition: all 0.3s ease; }
        .nav-link:hover { transform: translateY(-2px); }
        .card { transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .card:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
        pre { white-space: pre-wrap; word-wrap: break-word; }
    </style>
</head>
<body class="bg-gray-100">
    <div class="min-h-screen">
        <nav class="bg-green-600 text-white shadow-lg">
            <div class="container mx-auto px-4 py-3">
                <div class="flex justify-between items-center">
                    <h1 class="text-2xl font-bold flex items-center">
                        <i class="fas fa-database mr-2"></i> DriveKenya DB Browser
                    </h1>
                    <div class="text-sm">
                        <span class="bg-green-700 px-3 py-1 rounded-full">Connected to: ${dbPath}</span>
                    </div>
                </div>
                <div class="mt-3 flex flex-wrap gap-2">
                    <a href="/" class="nav-link bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-md text-sm font-medium">
                        <i class="fas fa-home mr-1"></i> Dashboard
                    </a>
                    <a href="/tables" class="nav-link bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                        <i class="fas fa-table mr-1"></i> All Tables
                    </a>
                    <a href="/users" class="nav-link bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                        <i class="fas fa-users mr-1"></i> Users
                    </a>
                    <a href="/cars" class="nav-link bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                        <i class="fas fa-car mr-1"></i> Vehicles
                    </a>
                    <a href="/rentals" class="nav-link bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                        <i class="fas fa-calendar-check mr-1"></i> Rentals
                    </a>
                    <a href="/reviews" class="nav-link bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                        <i class="fas fa-star mr-1"></i> Reviews
                    </a>
                    <a href="/support" class="nav-link bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                        <i class="fas fa-headset mr-1"></i> Support Tickets
                    </a>
                </div>
            </div>
        </nav>

        <main class="container mx-auto px-4 py-6">
            ${content}
        </main>
    </div>
</body>
</html>
`;

// Helper function to get table info
const getTableInfo = (tableName) => {
    try {
        const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
        const rowCount = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get().count;
        const sample = db.prepare(`SELECT * FROM ${tableName} LIMIT 1`).get() || {};

        return {
            name: tableName,
            columns: columns.map(col => col.name),
            rowCount,
            sample
        };
    } catch (err) {
        return {
            name: tableName,
            error: err.message,
            columns: [],
            rowCount: 0,
            sample: null
        };
    }
};

// Dashboard route
app.get('/', (req, res) => {
    const tables = [
        'users', 'cars', 'rentals', 'reviews',
        'review_photos', 'review_responses', 'messages',
        'chat_messages', 'chat_notifications', 'car_images',
        'car_specs', 'user_documents', 'car_availability_windows',
        'car_blackouts', 'rental_series'
    ];

    const tableStats = tables.map(table => getTableInfo(table));

    const content = `
        <div class="mb-8">
            <h2 class="text-2xl font-bold mb-4 text-gray-800">📊 Database Overview</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                ${tableStats.map(table => `
                    <div class="card bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
                        <h3 class="text-lg font-semibold mb-2 text-gray-800">
                            <i class="fas fa-table mr-2 text-blue-500"></i>${table.name}
                        </h3>
                        <p class="text-sm text-gray-600 mb-1">
                            <span class="font-medium">Rows:</span> 
                            <span class="text-gray-800">${table.rowCount.toLocaleString()}</span>
                        </p>
                        <p class="text-sm text-gray-600 mb-2">
                            <span class="font-medium">Columns:</span> 
                            <span class="text-gray-800">${table.columns.length}</span>
                        </p>
                        <div class="flex justify-between mt-3">
                            <a href="/table/${table.name}" 
                               class="text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-1 rounded">
                                <i class="fas fa-eye mr-1"></i> View
                            </a>
                            <a href="/query?q=SELECT * FROM ${table.name} LIMIT 10" 
                               class="text-xs bg-green-100 hover:bg-green-200 text-green-800 px-2 py-1 rounded">
                                <i class="fas fa-terminal mr-1"></i> Query
                            </a>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-xl font-bold mb-4 text-gray-800">📝 Run Custom Query</h2>
            <form action="/query" method="GET" class="mb-4">
                <div class="flex">
                    <input type="text" name="q" 
                           class="flex-1 p-2 border border-gray-300 rounded-l-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                           placeholder="SELECT * FROM users LIMIT 10" 
                           value="SELECT * FROM users LIMIT 10">
                    <button type="submit" 
                            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-md">
                        <i class="fas fa-play mr-1"></i> Run
                    </button>
                </div>
            </form>
        </div>
    `;

    res.send(htmlTemplate('Dashboard', content));
});

// Table view route
app.get('/table/:tableName', (req, res) => {
    const { tableName } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = 50;
    const offset = (page - 1) * limit;

    try {
        // Get table info
        const tableInfo = getTableInfo(tableName);
        if (tableInfo.error) throw new Error(tableInfo.error);

        // Get total count
        const totalCount = tableInfo.rowCount;
        const totalPages = Math.ceil(totalCount / limit);

        // Get paginated data
        const rows = db.prepare(`
            SELECT * FROM ${tableName} 
            LIMIT ? OFFSET ?
        `).all(limit, offset);

        // Generate table headers
        const headers = tableInfo.columns.map(col =>
            `<th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${col}</th>`
        ).join('');

        // Generate table rows
        const tableRows = rows.map(row => `
            <tr class="bg-white hover:bg-gray-50">
                ${tableInfo.columns.map(col => {
            let value = row[col];
            // Format JSON data
            if (typeof value === 'object' && value !== null) {
                value = `<pre class="text-xs p-1 bg-gray-100 rounded">${JSON.stringify(value, null, 2)}</pre>`;
            } else if (value === null) {
                value = '<span class="text-gray-400 italic">null</span>';
            } else if (value === '') {
                value = '<span class="text-gray-400 italic">(empty)</span>';
            } else if (typeof value === 'boolean') {
                value = value ? '<span class="text-green-600">✓</span>' : '<span class="text-red-600">✗</span>';
            }
            return `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-t border-gray-200">${value}</td>`;
        }).join('')}
            </tr>
        `).join('');

        // Generate pagination
        let pagination = '';
        if (totalPages > 1) {
            pagination = `
                <div class="flex items-center justify-between mt-4">
                    <div class="text-sm text-gray-700">
                        Showing <span class="font-medium">${offset + 1}</span> to 
                        <span class="font-medium">${Math.min(offset + limit, totalCount)}</span> of 
                        <span class="font-medium">${totalCount}</span> records
                    </div>
                    <div class="flex space-x-2">
                        ${page > 1 ? `
                            <a href="/table/${tableName}?page=${page - 1}" 
                               class="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                                Previous
                            </a>
                        ` : ''}
                        
                        ${Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return `
                                <a href="/table/${tableName}?page=${pageNum}" 
                                   class="px-3 py-1 rounded-md text-sm font-medium 
                                   ${page === pageNum ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}">
                                    ${pageNum}
                                </a>
                            `;
            }).join('')}
                        
                        ${page < totalPages ? `
                            <a href="/table/${tableName}?page=${page + 1}" 
                               class="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                                Next
                            </a>
                        ` : ''}
                    </div>
                </div>
            `;
        }

        const content = `
            <div class="mb-6">
                <h2 class="text-2xl font-bold text-gray-800 mb-2">
                    <i class="fas fa-table text-blue-500 mr-2"></i>${tableName}
                </h2>
                <p class="text-gray-600 mb-4">
                    ${totalCount.toLocaleString()} records | ${tableInfo.columns.length} columns
                </p>
            </div>

            <div class="bg-white shadow overflow-hidden border border-gray-200 rounded-lg">
                <div class="table-container overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>${headers}</tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${tableRows}
                        </tbody>
                    </table>
                </div>
                
                ${pagination}
                
                <div class="p-4 bg-gray-50 border-t border-gray-200">
                    <h3 class="text-sm font-medium text-gray-700 mb-2">Table Structure</h3>
                    <div class="bg-white p-3 rounded border border-gray-200 overflow-x-auto">
                        <pre class="text-xs"><code>${JSON.stringify(tableInfo, null, 2)}</code></pre>
                    </div>
                </div>
            </div>
        `;

        res.send(htmlTemplate(`Table: ${tableName}`, content));
    } catch (err) {
        const errorContent = `
            <div class="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
                <div class="flex">
                    <div class="flex-shrink-0">
                        <i class="fas fa-exclamation-circle text-red-400 text-xl"></i>
                    </div>
                    <div class="ml-3">
                        <h3 class="text-sm font-medium text-red-800">Error accessing table: ${tableName}</h3>
                        <div class="mt-2 text-sm text-red-700">
                            <p>${err.message}</p>
                            <p class="mt-2">The table might not exist or you might not have permission to access it.</p>
                        </div>
                    </div>
                </div>
            </div>
            <a href="/" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
                <i class="fas fa-arrow-left mr-2"></i> Back to Dashboard
            </a>
        `;
        res.status(404).send(htmlTemplate('Error', errorContent));
    }
});

// Custom query route
app.get('/query', (req, res) => {
    const query = req.query.q || 'SELECT * FROM users LIMIT 10';
    let results = [];
    let error = null;
    let columns = [];
    let rowCount = 0;

    try {
        if (query.trim().toLowerCase().startsWith('select')) {
            const stmt = db.prepare(query);
            results = stmt.all();
            rowCount = results.length;

            if (rowCount > 0) {
                columns = Object.keys(results[0]);
            }
        } else {
            // For non-SELECT queries (INSERT, UPDATE, DELETE)
            const result = db.prepare(query).run();
            rowCount = result.changes;
            results = [{
                operation: query.split(' ')[0].toUpperCase(),
                rowsAffected: result.changes,
                lastInsertRowid: result.lastInsertRowid
            }];
            columns = Object.keys(results[0]);
        }
    } catch (err) {
        error = err.message;
    }

    const content = `
        <div class="mb-6">
            <h2 class="text-2xl font-bold text-gray-800 mb-4">
                <i class="fas fa-terminal text-blue-500 mr-2"></i>Query Results
            </h2>
            
            <form action="/query" method="GET" class="mb-6">
                <div class="flex">
                    <input type="text" name="q" 
                           class="flex-1 p-2 border border-gray-300 rounded-l-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                           value="${query.replace(/"/g, '&quot;')}">
                    <button type="submit" 
                            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-md">
                        <i class="fas fa-play mr-1"></i> Run
                    </button>
                </div>
            </form>

            ${error ? `
                <div class="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <i class="fas fa-exclamation-circle text-red-400 text-xl"></i>
                        </div>
                        <div class="ml-3">
                            <h3 class="text-sm font-medium text-red-800">Query Error</h3>
                            <div class="mt-2 text-sm text-red-700">
                                <p>${error}</p>
                            </div>
                        </div>
                    </div>
                </div>
            ` : ''}

            ${rowCount > 0 ? `
                <div class="bg-white shadow overflow-hidden border border-gray-200 rounded-lg">
                    <div class="px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <div class="flex justify-between items-center">
                            <p class="text-sm text-gray-600">
                                ${rowCount} row${rowCount !== 1 ? 's' : ''} returned
                            </p>
                            <div class="text-sm">
                                <a href="/download?q=${encodeURIComponent(query)}" 
                                   class="text-blue-600 hover:text-blue-800">
                                    <i class="fas fa-download mr-1"></i> Export as CSV
                                </a>
                            </div>
                        </div>
                    </div>
                    
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    ${columns.map(col => `
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            ${col}
                                        </th>
                                    `).join('')}
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                ${results.slice(0, 100).map(row => `
                                    <tr class="hover:bg-gray-50">
                                        ${columns.map(col => {
        let value = row[col];
        if (value === null || value === undefined) {
            value = '<span class="text-gray-400 italic">null</span>';
        } else if (typeof value === 'object') {
            value = `<pre class="text-xs p-1 bg-gray-100 rounded">${JSON.stringify(value, null, 2)}</pre>`;
        } else if (typeof value === 'boolean') {
            value = value ? '<span class="text-green-600">✓</span>' : '<span class="text-red-600">✗</span>';
        }
        return `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${value}</td>`;
    }).join('')}
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    
                    ${rowCount > 100 ? `
                        <div class="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
                            Showing first 100 of ${rowCount} rows
                        </div>
                    ` : ''}
                </div>
            ` : `
                <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <i class="fas fa-info-circle text-yellow-400 text-xl"></i>
                        </div>
                        <div class="ml-3">
                            <p class="text-sm text-yellow-700">
                                No rows returned. The query executed successfully but didn't return any results.
                            </p>
                        </div>
                    </div>
                </div>
            `}
        </div>

        <div class="mt-8 bg-white shadow overflow-hidden border border-gray-200 rounded-lg">
            <div class="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h3 class="text-sm font-medium text-gray-900">Query Examples</h3>
            </div>
            <div class="p-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h4 class="text-sm font-medium text-gray-700 mb-2">Basic Queries</h4>
                        <ul class="space-y-2 text-sm text-gray-600">
                            <li>
                                <a href="/query?q=SELECT * FROM users LIMIT 10" 
                                   class="text-blue-600 hover:text-blue-800 block p-2 hover:bg-gray-50 rounded">
                                    SELECT * FROM users LIMIT 10
                                </a>
                            </li>
                            <li>
                                <a href="/query?q=SELECT * FROM cars WHERE available = 1" 
                                   class="text-blue-600 hover:text-blue-800 block p-2 hover:bg-gray-50 rounded">
                                    SELECT * FROM cars WHERE available = 1
                                </a>
                            </li>
                            <li>
                                <a href="/query?q=SELECT * FROM rentals ORDER BY start_date DESC" 
                                   class="text-blue-600 hover:text-blue-800 block p-2 hover:bg-gray-50 rounded">
                                    SELECT * FROM rentals ORDER BY start_date DESC
                                </a>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h4 class="text-sm font-medium text-gray-700 mb-2">Advanced Queries</h4>
                        <ul class="space-y-2 text-sm text-gray-600">
                            <li>
                                <a href="/query?q=SELECT u.email, COUNT(r.id) as rental_count FROM users u LEFT JOIN rentals r ON u.id = r.renter_id GROUP BY u.id" 
                                   class="text-blue-600 hover:text-blue-800 block p-2 hover:bg-gray-50 rounded">
                                    User rental counts
                                </a>
                            </li>
                            <li>
                                <a href="/query?q=SELECT make, model, AVG(price_per_day) as avg_price FROM cars GROUP BY make, model" 
                                   class="text-blue-600 hover:text-blue-800 block p-2 hover:bg-gray-50 rounded">
                                    Average prices by car make/model
                                </a>
                            </li>
                            <li>
                                <a href="/query?q=SELECT strftime('%Y-%m', start_date) as month, COUNT(*) as rental_count FROM rentals GROUP BY month" 
                                   class="text-blue-600 hover:text-blue-800 block p-2 hover:bg-gray-50 rounded">
                                    Rentals by month
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    `;

    res.send(htmlTemplate('Query Results', content));
});

// Download CSV route
app.get('/download', (req, res) => {
    const query = req.query.q;
    if (!query) {
        return res.status(400).send('No query provided');
    }

    try {
        const stmt = db.prepare(query);
        const rows = stmt.all();

        if (rows.length === 0) {
            return res.status(404).send('No data to export');
        }

        const columns = Object.keys(rows[0]);

        // Convert to CSV
        let csv = columns.join(',') + '\n';
        rows.forEach(row => {
            csv += columns.map(col => {
                let value = row[col];
                if (value === null || value === undefined) {
                    return 'NULL';
                }
                if (typeof value === 'object') {
                    value = JSON.stringify(value);
                }
                // Escape quotes and wrap in quotes if contains comma or newline
                const str = String(value).replace(/"/g, '""');
                return str.includes(',') || str.includes('\n') ? `"${str}"` : str;
            }).join(',') + '\n';
        });

        // Set headers for file download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=export-${Date.now()}.csv`);
        res.send(csv);
    } catch (err) {
        res.status(500).send(`Error executing query: ${err.message}`);
    }
});

// List all tables route
app.get('/tables', (req, res) => {
    try {
        const tables = db.prepare(`
            SELECT name FROM sqlite_master 
            WHERE type='table' 
            AND name NOT LIKE 'sqlite_%'
            ORDER BY name
        `).all();

        const content = `
            <div class="bg-white shadow overflow-hidden border border-gray-200 rounded-lg">
                <div class="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
                    <h3 class="text-lg font-medium leading-6 text-gray-900">
                        <i class="fas fa-table mr-2"></i>Database Tables
                    </h3>
                    <p class="mt-1 max-w-2xl text-sm text-gray-500">
                        ${tables.length} tables found in the database
                    </p>
                </div>
                <div class="bg-white shadow overflow-hidden sm:rounded-md">
                    <ul class="divide-y divide-gray-200">
                        ${tables.map(table => {
            const info = getTableInfo(table.name);
            return `
                                <li class="border-t border-gray-200">
                                    <a href="/table/${table.name}" class="block hover:bg-gray-50">
                                        <div class="px-4 py-4 sm:px-6">
                                            <div class="flex items-center justify-between">
                                                <div class="flex items-center">
                                                    <i class="fas fa-table text-blue-500 mr-3"></i>
                                                    <p class="text-sm font-medium text-blue-600 truncate">
                                                        ${table.name}
                                                    </p>
                                                </div>
                                                <div class="ml-2 flex-shrink-0 flex">
                                                    <p class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                       ${info.rowCount > 0 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                                                        ${info.rowCount} row${info.rowCount !== 1 ? 's' : ''}
                                                    </p>
                                                </div>
                                            </div>
                                            <div class="mt-2 sm:flex sm:justify-between">
                                                <div class="sm:flex">
                                                    <p class="flex items-center text-sm text-gray-500">
                                                        <i class="fas fa-columns mr-1.5 text-gray-400"></i>
                                                        ${info.columns.length} columns
                                                    </p>
                                                </div>
                                                <div class="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                                    <i class="fas fa-chevron-right text-gray-400"></i>
                                                </div>
                                            </div>
                                        </div>
                                    </a>
                                </li>
                            `;
        }).join('')}
                    </ul>
                </div>
            </div>
        `;

        res.send(htmlTemplate('All Tables', content));
    } catch (err) {
        const errorContent = `
            <div class="bg-red-50 border-l-4 border-red-400 p-4">
                <div class="flex">
                    <div class="flex-shrink-0">
                        <i class="fas fa-exclamation-circle text-red-400"></i>
                    </div>
                    <div class="ml-3">
                        <p class="text-sm text-red-700">
                            Error retrieving table list: ${err.message}
                        </p>
</div>
                    </div>
                </div>
            </div>
        `;
        res.status(500).send(htmlTemplate('Error', errorContent));
    }
});
// Users route - detailed view with stats
app.get('/users', (req, res) => {
    try {
        const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
        const totalUsers = users.length;
        const verifiedUsers = users.filter(u => u.email_verified).length;
        const adminUsers = users.filter(u => u.role === 'admin').length;
        const hostUsers = users.filter(u => u.role === 'host').length;
        const content = `
            <div class="mb-6">
                <h2 class="text-2xl font-bold text-gray-800 mb-4">
                    <i class="fas fa-users text-purple-500 mr-2"></i>Users Management
                </h2>
                
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div class="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
                        <p class="text-sm text-gray-600">Total Users</p>
                        <p class="text-2xl font-bold text-gray-900">${totalUsers}</p>
                    </div>
                    <div class="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
                        <p class="text-sm text-gray-600">Verified</p>
                        <p class="text-2xl font-bold text-gray-900">${verifiedUsers}</p>
                    </div>
                    <div class="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
                        <p class="text-sm text-gray-600">Admins</p>
                        <p class="text-2xl font-bold text-gray-900">${adminUsers}</p>
                    </div>
                    <div class="bg-white rounded-lg shadow p-4 border-l-4 border-indigo-500">
                        <p class="text-sm text-gray-600">Hosts</p>
                        <p class="text-2xl font-bold text-gray-900">${hostUsers}</p>
                    </div>
                </div>
            </div>
            <div class="bg-white shadow overflow-hidden border border-gray-200 rounded-lg">
                <div class="table-container overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Verified</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${users.map(user => `
                                <tr class="hover:bg-gray-50">
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${user.id}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${user.email}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${user.first_name} ${user.last_name}</td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : user.role === 'host' ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-800'}">${user.role}</span>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm">${user.email_verified ? '<span class="text-green-600">✓</span>' : '<span class="text-red-600">✗</span>'}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${new Date(user.created_at).toLocaleDateString()}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <a href="/users/${user.id}/edit" class="text-blue-600 hover:text-blue-900 mr-3" title="Edit User">
                                            <i class="fas fa-edit"></i> Edit
                                        </a>
                                        ${!user.email_verified ? `
                                            <form action="/users/${user.id}/verify" method="POST" style="display: inline;">
                                                <button type="submit" class="text-green-600 hover:text-green-900 mr-3" title="Verify Email">
                                                    <i class="fas fa-check-circle"></i> Verify
                                                </button>
                                            </form>
                                        ` : ''}
                                        <form action="/users/${user.id}/delete" method="POST" style="display: inline;" onsubmit="return confirm('Delete user ${user.email}?')">
                                            <button type="submit" class="text-red-600 hover:text-red-900" title="Delete User">
                                                <i class="fas fa-trash"></i> Delete
                                            </button>
                                        </form>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        res.send(htmlTemplate('Users', content));
    } catch (err) {
        res.status(500).send(htmlTemplate('Error', `<div class="text-red-600">Error: ${err.message}</div>`));
    }
});
// Cars route
app.get('/cars', (req, res) => {
    try {
        const cars = db.prepare(`SELECT c.*, u.first_name || ' ' || u.last_name as owner_name FROM cars c LEFT JOIN users u ON c.host_id = u.id ORDER BY c.created_at DESC`).all();
        const totalCars = cars.length;
        const availableCars = cars.filter(c => c.available).length;
        const avgPrice = cars.length > 0 ? (cars.reduce((sum, c) => sum + c.price_per_day, 0) / cars.length).toFixed(2) : 0;
        const content = `
            <div class="mb-6">
                <h2 class="text-2xl font-bold text-gray-800 mb-4"><i class="fas fa-car text-indigo-500 mr-2"></i>Vehicles Management</h2>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div class="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500"><p class="text-sm text-gray-600">Total Vehicles</p><p class="text-2xl font-bold text-gray-900">${totalCars}</p></div>
                    <div class="bg-white rounded-lg shadow p-4 border-l-4 border-green-500"><p class="text-sm text-gray-600">Available</p><p class="text-2xl font-bold text-gray-900">${availableCars}</p></div>
                    <div class="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500"><p class="text-sm text-gray-600">Avg Price/Day</p><p class="text-2xl font-bold text-gray-900">KES ${avgPrice}</p></div>
                </div>
            </div>
            <div class="bg-white shadow overflow-hidden border border-gray-200 rounded-lg">
                <div class="table-container overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50"><tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Make/Model</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">License</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price/Day</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Available</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr></thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${cars.map(car => `
                                <tr class="hover:bg-gray-50">
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${car.id}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${car.make} ${car.model}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${car.year}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${car.license_plate}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">KES ${car.price_per_day}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${car.owner_name || 'N/A'}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm">${car.available ? '<span class="text-green-600">✓</span>' : '<span class="text-red-600">✗</span>'}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <a href="/cars/${car.id}/edit" class="text-blue-600 hover:text-blue-900 mr-3" title="Edit Vehicle">
                                            <i class="fas fa-edit"></i> Edit
                                        </a>
                                        <form action="/cars/${car.id}/delete" method="POST" style="display: inline;" onsubmit="return confirm('Delete vehicle ${car.make} ${car.model}?')">
                                            <button type="submit" class="text-red-600 hover:text-red-900" title="Delete Vehicle">
                                                <i class="fas fa-trash"></i> Delete
                                            </button>
                                        </form>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        res.send(htmlTemplate('Cars', content));
    } catch (err) {
        res.status(500).send(htmlTemplate('Error', `<div class="text-red-600">Error: ${err.message}</div>`));
    }
});
// Rentals route
app.get('/rentals', (req, res) => {
    try {
        const rentals = db.prepare(`SELECT r.*, c.make || ' ' || c.model as car_name, u.first_name || ' ' || u.last_name as renter_name FROM rentals r LEFT JOIN cars c ON r.car_id = c.id LEFT JOIN users u ON r.renter_id = u.id ORDER BY r.start_date DESC`).all();
        const totalRentals = rentals.length;
        const activeRentals = rentals.filter(r => r.status === 'active').length;
        const completedRentals = rentals.filter(r => r.status === 'completed').length;
        const totalRevenue = rentals.reduce((sum, r) => sum + (r.total_price || 0), 0);
        const content = `
            <div class="mb-6">
                <h2 class="text-2xl font-bold text-gray-800 mb-4"><i class="fas fa-calendar-check text-yellow-500 mr-2"></i>Rentals Management</h2>
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div class="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500"><p class="text-sm text-gray-600">Total Rentals</p><p class="text-2xl font-bold text-gray-900">${totalRentals}</p></div>
                    <div class="bg-white rounded-lg shadow p-4 border-l-4 border-green-500"><p class="text-sm text-gray-600">Active</p><p class="text-2xl font-bold text-gray-900">${activeRentals}</p></div>
                    <div class="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500"><p class="text-sm text-gray-600">Completed</p><p class="text-2xl font-bold text-gray-900">${completedRentals}</p></div>
                    <div class="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500"><p class="text-sm text-gray-600">Total Revenue</p><p class="text-2xl font-bold text-gray-900">KES ${totalRevenue.toLocaleString()}</p></div>
                </div>
            </div>
            <div class="bg-white shadow overflow-hidden border border-gray-200 rounded-lg">
                <div class="table-container overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50"><tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Car</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Renter</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr></thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${rentals.map(rental => `
                                <tr class="hover:bg-gray-50">
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${rental.id}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${rental.car_name || 'N/A'}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${rental.renter_name || 'N/A'}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${new Date(rental.start_date).toLocaleDateString()}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${new Date(rental.end_date).toLocaleDateString()}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">KES ${rental.total_price}</td>
                                    <td class="px-6 py-4 whitespace-nowrap"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${rental.status === 'active' ? 'bg-green-100 text-green-800' : rental.status === 'completed' ? 'bg-blue-100 text-blue-800' : rental.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}">${rental.status}</span></td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <a href="/rentals/${rental.id}/edit" class="text-blue-600 hover:text-blue-900 mr-3" title="Edit Rental">
                                            <i class="fas fa-edit"></i> Edit
                                        </a>
                                        <form action="/rentals/${rental.id}/delete" method="POST" style="display: inline;" onsubmit="return confirm('Delete rental #${rental.id}?')">
                                            <button type="submit" class="text-red-600 hover:text-red-900" title="Delete Rental">
                                                <i class="fas fa-trash"></i> Delete
                                            </button>
                                        </form>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        res.send(htmlTemplate('Rentals', content));
    } catch (err) {
        res.status(500).send(htmlTemplate('Error', `<div class="text-red-600">Error: ${err.message}</div>`));
    }
});
// Reviews route
app.get('/reviews', (req, res) => {
    try {
        const reviews = db.prepare(`SELECT r.*, c.make || ' ' || c.model as car_name, u.first_name || ' ' || u.last_name as reviewer_name FROM reviews r LEFT JOIN cars c ON r.car_id = c.id LEFT JOIN users u ON r.reviewer_id = u.id ORDER BY r.created_at DESC`).all();
        const totalReviews = reviews.length;
        const avgRating = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : 0;
        const fiveStarReviews = reviews.filter(r => r.rating === 5).length;
        const content = `
            <div class="mb-6">
                <h2 class="text-2xl font-bold text-gray-800 mb-4"><i class="fas fa-star text-pink-500 mr-2"></i>Reviews Management</h2>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div class="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500"><p class="text-sm text-gray-600">Total Reviews</p><p class="text-2xl font-bold text-gray-900">${totalReviews}</p></div>
                    <div class="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500"><p class="text-sm text-gray-600">Average Rating</p><p class="text-2xl font-bold text-gray-900">${avgRating} ⭐</p></div>
                    <div class="bg-white rounded-lg shadow p-4 border-l-4 border-green-500"><p class="text-sm text-gray-600">5-Star Reviews</p><p class="text-2xl font-bold text-gray-900">${fiveStarReviews}</p></div>
                </div>
            </div>
            <div class="bg-white shadow overflow-hidden border border-gray-200 rounded-lg">
                <div class="table-container overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50"><tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Car</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reviewer</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Comment</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr></thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${reviews.map(review => `
                                <tr class="hover:bg-gray-50">
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${review.id}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${review.car_name || 'N/A'}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${review.reviewer_name || 'N/A'}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${'⭐'.repeat(review.rating)}</td>
                                    <td class="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">${review.comment || '<span class="text-gray-400 italic">No comment</span>'}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${new Date(review.created_at).toLocaleDateString()}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <form action="/reviews/${review.id}/delete" method="POST" style="display: inline;" onsubmit="return confirm('Delete review from ${review.reviewer_name}?')">
                                            <button type="submit" class="text-red-600 hover:text-red-900" title="Delete Review">
                                                <i class="fas fa-trash"></i> Delete
                                            </button>
                                        </form>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        res.send(htmlTemplate('Reviews', content));
    } catch (err) {
        res.status(500).send(htmlTemplate('Error', `<div class="text-red-600">Error: ${err.message}</div>`));
    }
});

// Support Tickets route
app.get('/support', (req, res) => {
    try {
        const tickets = db.prepare(`
            SELECT 
                st.*,
                u.first_name || ' ' || u.last_name as user_name,
                u.email as user_email,
                u.phone as user_phone
            FROM support_tickets st
            JOIN users u ON st.user_id = u.id
            ORDER BY 
                CASE st.status 
                    WHEN 'open' THEN 1 
                    WHEN 'in_progress' THEN 2 
                    ELSE 3 
                END,
                st.created_at DESC
        `).all();
        
        const openCount = tickets.filter(t => t.status === 'open').length;
        const inProgressCount = tickets.filter(t => t.status === 'in_progress').length;
        const resolvedCount = tickets.filter(t => t.status === 'resolved').length;

        const content = `
            <div class="mb-6">
                <h2 class="text-2xl font-bold text-gray-800 mb-4">
                    <i class="fas fa-headset text-red-500 mr-2"></i>Support Tickets Management
                </h2>
                
                <!-- Stats Cards -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div class="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
                        <p class="text-sm text-gray-600">Total Tickets</p>
                        <p class="text-2xl font-bold text-gray-900">${tickets.length}</p>
                    </div>
                    <div class="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
                        <p class="text-sm text-gray-600">Open</p>
                        <p class="text-2xl font-bold text-yellow-600">${openCount}</p>
                    </div>
                    <div class="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
                        <p class="text-sm text-gray-600">In Progress</p>
                        <p class="text-2xl font-bold text-orange-600">${inProgressCount}</p>
                    </div>
                    <div class="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
                        <p class="text-sm text-gray-600">Resolved</p>
                        <p class="text-2xl font-bold text-green-600">${resolvedCount}</p>
                    </div>
                </div>
            </div>
            
            <div class="bg-white shadow overflow-hidden border border-gray-200 rounded-lg">
                <div class="table-container overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${tickets.map(ticket => `
                                <tr class="hover:bg-gray-50">
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">#${ticket.id}</td>
                                    <td class="px-6 py-4 text-sm text-gray-900">
                                        <div class="font-medium">${ticket.user_name}</div>
                                        <div class="text-gray-500 text-xs">${ticket.user_email}</div>
                                        <div class="text-gray-500 text-xs">${ticket.user_phone || 'N/A'}</div>
                                    </td>
                                    <td class="px-6 py-4 text-sm text-gray-900">
                                        <div class="max-w-xs">${ticket.subject}</div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                            ${ticket.category}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            ticket.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                            ticket.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                            ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-green-100 text-green-800'
                                        }">
                                            ${ticket.priority}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            ticket.status === 'open' ? 'bg-blue-100 text-blue-800' :
                                            ticket.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                                            ticket.status === 'resolved' ? 'bg-green-100 text-green-800' :
                                            'bg-gray-100 text-gray-800'
                                        }">
                                            ${ticket.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        ${new Date(ticket.created_at).toLocaleString()}
                                    </td>
                                    <td class="px-6 py-4 text-sm text-gray-500">
                                        <div class="max-w-md">${ticket.description}</div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                                        <a href="/support/${ticket.id}" class="text-blue-600 hover:text-blue-900 font-medium mr-3">
                                            <i class="fas fa-eye mr-1"></i>View & Reply
                                        </a>
                                        <form action="/support/${ticket.id}/delete" method="POST" style="display: inline;" onsubmit="return confirm('Delete ticket #${ticket.id}?')">
                                            <button type="submit" class="text-red-600 hover:text-red-900" title="Delete Ticket">
                                                <i class="fas fa-trash"></i> Delete
                                            </button>
                                        </form>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                ${tickets.length === 0 ? `
                    <div class="text-center py-12">
                        <i class="fas fa-inbox text-gray-400 text-5xl mb-4"></i>
                        <p class="text-gray-500 text-lg">No support tickets found</p>
                    </div>
                ` : ''}
            </div>
        `;
        res.send(htmlTemplate('Support Tickets', content));
    } catch (err) {
        res.status(500).send(htmlTemplate('Error', `<div class="text-red-600">Error: ${err.message}</div>`));
    }
});

// Support Ticket Detail & Reply
app.get('/support/:id', (req, res) => {
    try {
        const { id } = req.params;
        
        const ticket = db.prepare(`
            SELECT 
                st.*,
                u.first_name || ' ' || u.last_name as user_name,
                u.email as user_email,
                u.phone as user_phone
            FROM support_tickets st
            JOIN users u ON st.user_id = u.id
            WHERE st.id = ?
        `).get(id);

        if (!ticket) {
            return res.status(404).send(htmlTemplate('Error', '<div class="text-red-600">Ticket not found</div>'));
        }

        const messages = db.prepare(`
            SELECT tm.*,
                   CASE 
                       WHEN tm.sender_type = 'user' THEN u.first_name || ' ' || u.last_name
                       WHEN tm.sender_type = 'admin' THEN a.first_name || ' ' || a.last_name
                       ELSE 'System'
                   END as sender_name
            FROM ticket_messages tm
            LEFT JOIN users u ON tm.sender_type = 'user' AND tm.sender_id = u.id
            LEFT JOIN users a ON tm.sender_type = 'admin' AND tm.sender_id = a.id
            WHERE tm.ticket_id = ?
            ORDER BY tm.created_at ASC
        `).all(id);

        const content = `
            <div class="mb-6">
                <a href="/support" class="text-blue-600 hover:text-blue-800 inline-flex items-center mb-4">
                    <i class="fas fa-arrow-left mr-2"></i> Back to Tickets
                </a>
                
                <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <div class="flex justify-between items-start mb-6">
                        <div>
                            <h2 class="text-2xl font-bold text-gray-900 mb-2">${ticket.subject}</h2>
                            <p class="text-gray-600">Ticket #${ticket.id} • Created ${new Date(ticket.created_at).toLocaleString()}</p>
                        </div>
                        <div class="flex gap-2">
                            <span class="px-3 py-1 text-sm font-semibold rounded-full ${
                                ticket.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                ticket.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                            }">
                                ${ticket.priority.toUpperCase()}
                            </span>
                            <span class="px-3 py-1 text-sm font-semibold rounded-full ${
                                ticket.status === 'open' ? 'bg-blue-100 text-blue-800' :
                                ticket.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                                ticket.status === 'resolved' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                            }">
                                ${ticket.status.replace('_', ' ').toUpperCase()}
                            </span>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-6 mb-6 p-4 bg-gray-50 rounded-lg">
                        <div>
                            <p class="text-sm text-gray-600 mb-1">Customer</p>
                            <p class="font-semibold text-gray-900">${ticket.user_name}</p>
                            <p class="text-sm text-gray-600">${ticket.user_email}</p>
                            <p class="text-sm text-gray-600">${ticket.user_phone || 'N/A'}</p>
                        </div>
                        <div>
                            <p class="text-sm text-gray-600 mb-1">Category</p>
                            <p class="font-semibold text-gray-900">${ticket.category}</p>
                        </div>
                    </div>

                    <div class="border-t border-gray-200 pt-4">
                        <p class="text-sm text-gray-600 mb-2">Original Message:</p>
                        <p class="text-gray-900">${ticket.description}</p>
                    </div>
                </div>

                <!-- Status Update Buttons -->
                <div class="bg-white rounded-lg shadow p-4 mb-6">
                    <h3 class="font-semibold text-gray-900 mb-3">Update Status:</h3>
                    <div class="flex gap-2">
                        ${ticket.status === 'open' ? `
                            <form action="/support/${ticket.id}/update-status" method="POST" style="display: inline;">
                                <input type="hidden" name="status" value="in_progress">
                                <button type="submit" class="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium">
                                    <i class="fas fa-hourglass-half mr-1"></i> Mark In Progress
                                </button>
                            </form>
                        ` : ''}
                        ${ticket.status === 'open' || ticket.status === 'in_progress' ? `
                            <form action="/support/${ticket.id}/update-status" method="POST" style="display: inline;">
                                <input type="hidden" name="status" value="resolved">
                                <button type="submit" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium">
                                    <i class="fas fa-check-circle mr-1"></i> Mark Resolved
                                </button>
                            </form>
                        ` : ''}
                        ${ticket.status === 'resolved' ? `
                            <form action="/support/${ticket.id}/update-status" method="POST" style="display: inline;">
                                <input type="hidden" name="status" value="closed">
                                <button type="submit" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium">
                                    <i class="fas fa-times-circle mr-1"></i> Close Ticket
                                </button>
                            </form>
                        ` : ''}
                    </div>
                </div>

                <!-- Conversation -->
                <div class="bg-white rounded-lg shadow-lg p-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">
                        <i class="fas fa-comments mr-2"></i>Conversation
                    </h3>
                    
                    ${messages.length > 0 ? `
                        <div class="space-y-4 mb-6">
                            ${messages.map(msg => `
                                <div class="flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}">
                                    <div class="max-w-lg ${msg.sender_type === 'admin' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'} rounded-lg p-4">
                                        <div class="flex items-center gap-2 mb-2">
                                            <span class="text-sm font-semibold">${msg.sender_name}</span>
                                            <span class="text-xs opacity-75">${new Date(msg.created_at).toLocaleString()}</span>
                                        </div>
                                        <p class="text-sm">${msg.message}</p>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p class="text-gray-500 mb-6">No messages yet</p>'}

                    <!-- Reply Form -->
                    <form action="/support/${ticket.id}/reply" method="POST" class="border-t border-gray-200 pt-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Your Reply:</label>
                        <textarea 
                            name="message" 
                            required
                            rows="4" 
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Type your response to the customer..."></textarea>
                        <button 
                            type="submit" 
                            class="mt-3 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium inline-flex items-center">
                            <i class="fas fa-paper-plane mr-2"></i> Send Reply
                        </button>
                    </form>
                </div>
            </div>
        `;
        res.send(htmlTemplate(`Ticket #${ticket.id}`, content));
    } catch (err) {
        res.status(500).send(htmlTemplate('Error', `<div class="text-red-600">Error: ${err.message}</div>`));
    }
});

// Handle reply submission
app.use(express.urlencoded({ extended: true }));
app.post('/support/:id/reply', async (req, res) => {
    try {
        const { id } = req.params;
        const { message } = req.body;

        if (!message) {
            return res.redirect(`/support/${id}?error=Message required`);
        }

        // Get ticket and user details
        const ticket = db.prepare(`
            SELECT st.*, u.email as user_email, u.first_name || ' ' || u.last_name as user_name
            FROM support_tickets st
            JOIN users u ON st.user_id = u.id
            WHERE st.id = ?
        `).get(id);

        if (!ticket) {
            return res.redirect('/support?error=Ticket not found');
        }

        // Insert reply (admin_id 1 is a placeholder - in production, use actual admin session)
        db.prepare(`
            INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, message, created_at)
            VALUES (?, 'admin', 1, ?, ?)
        `).run(id, message, new Date().toISOString());

        // Update ticket status to in_progress if it was open
        db.prepare(`
            UPDATE support_tickets 
            SET status = CASE WHEN status = 'open' THEN 'in_progress' ELSE status END,
                updated_at = ?
            WHERE id = ?
        `).run(new Date().toISOString(), id);

        // Send email notification to customer
        await sendTicketReplyEmail(
            ticket.user_email,
            ticket.user_name,
            ticket.id,
            ticket.subject,
            message
        );

        res.redirect(`/support/${id}`);
    } catch (err) {
        res.status(500).send(htmlTemplate('Error', `<div class="text-red-600">Error: ${err.message}</div>`));
    }
});

// Handle status update
app.post('/support/:id/update-status', (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
        if (!validStatuses.includes(status)) {
            return res.redirect(`/support/${id}?error=Invalid status`);
        }

        db.prepare(`
            UPDATE support_tickets 
            SET status = ?,
                resolved_at = CASE WHEN ? IN ('resolved', 'closed') THEN ? ELSE resolved_at END,
                updated_at = ?
            WHERE id = ?
        `).run(status, status, new Date().toISOString(), new Date().toISOString(), id);

        res.redirect(`/support/${id}`);
    } catch (err) {
        res.status(500).send(htmlTemplate('Error', `<div class="text-red-600">Error: ${err.message}</div>`));
    }
});

// ==================== EDIT FORMS AND UPDATE ROUTES ====================

// User Edit Form
app.get('/users/:id/edit', (req, res) => {
    try {
        const { id } = req.params;
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
        
        if (!user) {
            return res.status(404).send(htmlTemplate('Error', '<div class="text-red-600">User not found</div>'));
        }

        const content = `
            <div class="max-w-2xl mx-auto">
                <h2 class="text-2xl font-bold text-gray-800 mb-6">
                    <i class="fas fa-user-edit text-blue-500 mr-2"></i>Edit User #${user.id}
                </h2>
                
                <div class="bg-white shadow overflow-hidden border border-gray-200 rounded-lg p-6">
                    <form method="POST" action="/users/${user.id}/update">
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input type="email" name="email" value="${user.email}" required
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                                <input type="text" name="first_name" value="${user.first_name || ''}" required
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                                <input type="text" name="last_name" value="${user.last_name || ''}" required
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                <input type="tel" name="phone" value="${user.phone || ''}" 
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                <select name="role" required
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="customer" ${user.role === 'customer' ? 'selected' : ''}>Customer</option>
                                    <option value="host" ${user.role === 'host' ? 'selected' : ''}>Host</option>
                                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                                </select>
                            </div>
                            
                            <div class="flex items-center">
                                <input type="checkbox" name="email_verified" id="email_verified" ${user.email_verified ? 'checked' : ''}
                                    class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
                                <label for="email_verified" class="ml-2 block text-sm text-gray-700">Email Verified</label>
                            </div>
                            
                            <div class="flex gap-3 pt-4">
                                <button type="submit" class="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <i class="fas fa-save mr-2"></i>Save Changes
                                </button>
                                <a href="/users" class="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500">
                                    <i class="fas fa-times mr-2"></i>Cancel
                                </a>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        res.send(htmlTemplate('Edit User', content));
    } catch (err) {
        res.status(500).send(htmlTemplate('Error', `<div class="text-red-600">Error: ${err.message}</div>`));
    }
});

// User Update Handler
app.post('/users/:id/update', (req, res) => {
    try {
        const { id } = req.params;
        const { email, first_name, last_name, phone, role, email_verified } = req.body;
        
        db.prepare(`
            UPDATE users 
            SET email = ?, first_name = ?, last_name = ?, phone = ?, role = ?, email_verified = ?
            WHERE id = ?
        `).run(email, first_name, last_name, phone || null, role, email_verified ? 1 : 0, id);
        
        res.redirect('/users');
    } catch (err) {
        res.status(500).send(htmlTemplate('Error', `<div class="text-red-600">Error: ${err.message}</div>`));
    }
});

// Car Edit Form
app.get('/cars/:id/edit', (req, res) => {
    try {
        const { id } = req.params;
        const car = db.prepare('SELECT * FROM cars WHERE id = ?').get(id);
        const hosts = db.prepare("SELECT id, first_name, last_name FROM users WHERE role = 'host'").all();
        
        if (!car) {
            return res.status(404).send(htmlTemplate('Error', '<div class="text-red-600">Car not found</div>'));
        }

        const content = `
            <div class="max-w-2xl mx-auto">
                <h2 class="text-2xl font-bold text-gray-800 mb-6">
                    <i class="fas fa-car text-indigo-500 mr-2"></i>Edit Vehicle #${car.id}
                </h2>
                
                <div class="bg-white shadow overflow-hidden border border-gray-200 rounded-lg p-6">
                    <form method="POST" action="/cars/${car.id}/update">
                        <div class="space-y-4">
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Make</label>
                                    <input type="text" name="make" value="${car.make}" required
                                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Model</label>
                                    <input type="text" name="model" value="${car.model}" required
                                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                            </div>
                            
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Year</label>
                                    <input type="number" name="year" value="${car.year}" required min="1900" max="2100"
                                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">License Plate</label>
                                    <input type="text" name="license_plate" value="${car.license_plate}" required
                                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Price per Day (KES)</label>
                                <input type="number" name="price_per_day" value="${car.price_per_day}" required min="0" step="0.01"
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Owner (Host)</label>
                                <select name="host_id" required
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    ${hosts.map(host => `
                                        <option value="${host.id}" ${car.host_id === host.id ? 'selected' : ''}>
                                            ${host.first_name} ${host.last_name}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                            
                            <div class="flex items-center">
                                <input type="checkbox" name="available" id="available" ${car.available ? 'checked' : ''}
                                    class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
                                <label for="available" class="ml-2 block text-sm text-gray-700">Available for Rent</label>
                            </div>
                            
                            <div class="flex gap-3 pt-4">
                                <button type="submit" class="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <i class="fas fa-save mr-2"></i>Save Changes
                                </button>
                                <a href="/cars" class="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500">
                                    <i class="fas fa-times mr-2"></i>Cancel
                                </a>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        res.send(htmlTemplate('Edit Vehicle', content));
    } catch (err) {
        res.status(500).send(htmlTemplate('Error', `<div class="text-red-600">Error: ${err.message}</div>`));
    }
});

// Car Update Handler
app.post('/cars/:id/update', (req, res) => {
    try {
        const { id } = req.params;
        const { make, model, year, license_plate, price_per_day, host_id, available } = req.body;
        
        db.prepare(`
            UPDATE cars 
            SET make = ?, model = ?, year = ?, license_plate = ?, price_per_day = ?, host_id = ?, available = ?
            WHERE id = ?
        `).run(make, model, parseInt(year), license_plate, parseFloat(price_per_day), parseInt(host_id), available ? 1 : 0, id);
        
        res.redirect('/cars');
    } catch (err) {
        res.status(500).send(htmlTemplate('Error', `<div class="text-red-600">Error: ${err.message}</div>`));
    }
});

// Car Delete Handler
app.post('/cars/:id/delete', (req, res) => {
    try {
        const { id } = req.params;
        db.prepare('DELETE FROM cars WHERE id = ?').run(id);
        res.redirect('/cars');
    } catch (err) {
        res.status(500).send(htmlTemplate('Error', `<div class="text-red-600">Error: ${err.message}</div>`));
    }
});

// Rental Edit Form
app.get('/rentals/:id/edit', (req, res) => {
    try {
        const { id } = req.params;
        const rental = db.prepare('SELECT * FROM rentals WHERE id = ?').get(id);
        
        if (!rental) {
            return res.status(404).send(htmlTemplate('Error', '<div class="text-red-600">Rental not found</div>'));
        }

        const content = `
            <div class="max-w-2xl mx-auto">
                <h2 class="text-2xl font-bold text-gray-800 mb-6">
                    <i class="fas fa-calendar-check text-yellow-500 mr-2"></i>Edit Rental #${rental.id}
                </h2>
                
                <div class="bg-white shadow overflow-hidden border border-gray-200 rounded-lg p-6">
                    <form method="POST" action="/rentals/${rental.id}/update">
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                <input type="date" name="start_date" value="${rental.start_date?.split('T')[0] || ''}" required
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                <input type="date" name="end_date" value="${rental.end_date?.split('T')[0] || ''}" required
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Total Price (KES)</label>
                                <input type="number" name="total_price" value="${rental.total_price}" required min="0" step="0.01"
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select name="status" required
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="pending" ${rental.status === 'pending' ? 'selected' : ''}>Pending</option>
                                    <option value="confirmed" ${rental.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                                    <option value="active" ${rental.status === 'active' ? 'selected' : ''}>Active</option>
                                    <option value="completed" ${rental.status === 'completed' ? 'selected' : ''}>Completed</option>
                                    <option value="cancelled" ${rental.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                                </select>
                            </div>
                            
                            <div class="flex gap-3 pt-4">
                                <button type="submit" class="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <i class="fas fa-save mr-2"></i>Save Changes
                                </button>
                                <a href="/rentals" class="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500">
                                    <i class="fas fa-times mr-2"></i>Cancel
                                </a>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        res.send(htmlTemplate('Edit Rental', content));
    } catch (err) {
        res.status(500).send(htmlTemplate('Error', `<div class="text-red-600">Error: ${err.message}</div>`));
    }
});

// Rental Update Handler
app.post('/rentals/:id/update', (req, res) => {
    try {
        const { id } = req.params;
        const { start_date, end_date, total_price, status } = req.body;
        
        db.prepare(`
            UPDATE rentals 
            SET start_date = ?, end_date = ?, total_price = ?, status = ?
            WHERE id = ?
        `).run(start_date, end_date, parseFloat(total_price), status, id);
        
        res.redirect('/rentals');
    } catch (err) {
        res.status(500).send(htmlTemplate('Error', `<div class="text-red-600">Error: ${err.message}</div>`));
    }
});

// Rental Delete Handler
app.post('/rentals/:id/delete', (req, res) => {
    try {
        const { id } = req.params;
        db.prepare('DELETE FROM rentals WHERE id = ?').run(id);
        res.redirect('/rentals');
    } catch (err) {
        res.status(500).send(htmlTemplate('Error', `<div class="text-red-600">Error: ${err.message}</div>`));
    }
});

// Review Delete Handler
app.post('/reviews/:id/delete', (req, res) => {
    try {
        const { id } = req.params;
        db.prepare('DELETE FROM reviews WHERE id = ?').run(id);
        res.redirect('/reviews');
    } catch (err) {
        res.status(500).send(htmlTemplate('Error', `<div class="text-red-600">Error: ${err.message}</div>`));
    }
});

// Support Ticket Delete Handler
app.post('/support/:id/delete', (req, res) => {
    try {
        const { id } = req.params;
        // Delete messages first (foreign key constraint)
        db.prepare('DELETE FROM ticket_messages WHERE ticket_id = ?').run(id);
        db.prepare('DELETE FROM support_tickets WHERE id = ?').run(id);
        res.redirect('/support');
    } catch (err) {
        res.status(500).send(htmlTemplate('Error', `<div class="text-red-600">Error: ${err.message}</div>`));
    }
});

// ==================== VERIFICATION/STATUS ROUTES ====================

// User verification endpoint
app.post('/users/:id/verify', (req, res) => {
    try {
        const { id } = req.params;
        db.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').run(id);
        res.redirect('/users');
    } catch (err) {
        res.status(500).send(htmlTemplate('Error', `<div class="text-red-600">Error: ${err.message}</div>`));
    }
});

// User deletion endpoint
app.post('/users/:id/delete', (req, res) => {
    try {
        const { id } = req.params;
        db.prepare('DELETE FROM users WHERE id = ?').run(id);
        res.redirect('/users');
    } catch (err) {
        res.status(500).send(htmlTemplate('Error', `<div class="text-red-600">Error: ${err.message}</div>`));
    }
});

// Start the server
app.listen(port, () => {
    console.log(`🌐 Database Browser running at http://localhost:${port}`);
    console.log(`📊 Access the database browser in your web browser!`);
});
// Handle process termination
process.on('SIGINT', () => {
    console.log('\nClosing database connection...');
    db.close();
    process.exit(0);
});