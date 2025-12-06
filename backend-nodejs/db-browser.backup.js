// Database browser for DriveKenya
import express from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
                        <i class="fas fa-car mr-1"></i> Cars
                    </a>
                    <a href="/rentals" class="nav-link bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                        <i class="fas fa-calendar-check mr-1"></i> Rentals
                    </a>
                    <a href="/reviews" class="nav-link bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                        <i class="fas fa-star mr-1"></i> Reviews
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
process.on('SIGINT', () => {
    console.log('\nClosing database connection...');
    db.close();
    process.exit(0);
});