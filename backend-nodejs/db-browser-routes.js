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
                
                <!-- Stats Cards -->
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
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${users.map(user => `
                                <tr class="hover:bg-gray-50">
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${user.id}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${user.email}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${user.first_name} ${user.last_name}</td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                user.role === 'host' ? 'bg-indigo-100 text-indigo-800' :
                    'bg-gray-100 text-gray-800'}">
                                            ${user.role}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                                        ${user.email_verified ? '<span class="text-green-600">✓</span>' : '<span class="text-red-600">✗</span>'}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        ${new Date(user.created_at).toLocaleDateString()}
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

// Cars route - detailed view with stats
app.get('/cars', (req, res) => {
    try {
        const cars = db.prepare(`
            SELECT c.*, u.email as owner_email, u.first_name || ' ' || u.last_name as owner_name
            FROM cars c
            LEFT JOIN users u ON c.host_id = u.id
            ORDER BY c.created_at DESC
        `).all();

        const totalCars = cars.length;
        const availableCars = cars.filter(c => c.available).length;
        const avgPrice = cars.length > 0 ? (cars.reduce((sum, c) => sum + c.price_per_day, 0) / cars.length).toFixed(2) : 0;

        const content = `
            <div class="mb-6">
                <h2 class="text-2xl font-bold text-gray-800 mb-4">
                    <i class="fas fa-car text-indigo-500 mr-2"></i>Cars Management
                </h2>
                
                <!-- Stats Cards -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div class="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
                        <p class="text-sm text-gray-600">Total Cars</p>
                        <p class="text-2xl font-bold text-gray-900">${totalCars}</p>
                    </div>
                    <div class="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
                        <p class="text-sm text-gray-600">Available</p>
                        <p class="text-2xl font-bold text-gray-900">${availableCars}</p>
                    </div>
                    <div class="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
                        <p class="text-sm text-gray-600">Avg Price/Day</p>
                        <p class="text-2xl font-bold text-gray-900">KES ${avgPrice}</p>
                    </div>
                </div>
            </div>

            <div class="bg-white shadow overflow-hidden border border-gray-200 rounded-lg">
                <div class="table-container overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Make/Model</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">License</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price/Day</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Available</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${cars.map(car => `
                                <tr class="hover:bg-gray-50">
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${car.id}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        ${car.make} ${car.model}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${car.year}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${car.license_plate}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">KES ${car.price_per_day}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${car.owner_name || 'N/A'}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                                        ${car.available ? '<span class="text-green-600">✓</span>' : '<span class="text-red-600">✗</span>'}
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

// Rentals route - detailed view with stats
app.get('/rentals', (req, res) => {
    try {
        const rentals = db.prepare(`
            SELECT r.*, 
                   c.make || ' ' || c.model as car_name,
                   u.email as renter_email,
                   u.first_name || ' ' || u.last_name as renter_name
            FROM rentals r
            LEFT JOIN cars c ON r.car_id = c.id
            LEFT JOIN users u ON r.renter_id = u.id
            ORDER BY r.start_date DESC
        `).all();

        const totalRentals = rentals.length;
        const activeRentals = rentals.filter(r => r.status === 'active').length;
        const completedRentals = rentals.filter(r => r.status === 'completed').length;
        const totalRevenue = rentals.reduce((sum, r) => sum + (r.total_price || 0), 0);

        const content = `
            <div class="mb-6">
                <h2 class="text-2xl font-bold text-gray-800 mb-4">
                    <i class="fas fa-calendar-check text-yellow-500 mr-2"></i>Rentals Management
                </h2>
                
                <!-- Stats Cards -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div class="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
                        <p class="text-sm text-gray-600">Total Rentals</p>
                        <p class="text-2xl font-bold text-gray-900">${totalRentals}</p>
                    </div>
                    <div class="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
                        <p class="text-sm text-gray-600">Active</p>
                        <p class="text-2xl font-bold text-gray-900">${activeRentals}</p>
                    </div>
                    <div class="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
                        <p class="text-sm text-gray-600">Completed</p>
                        <p class="text-2xl font-bold text-gray-900">${completedRentals}</p>
                    </div>
                    <div class="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
                        <p class="text-sm text-gray-600">Total Revenue</p>
                        <p class="text-2xl font-bold text-gray-900">KES ${totalRevenue.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            <div class="bg-white shadow overflow-hidden border border-gray-200 rounded-lg">
                <div class="table-container overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Car</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Renter</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Price</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${rentals.map(rental => `
                                <tr class="hover:bg-gray-50">
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${rental.id}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${rental.car_name || 'N/A'}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${rental.renter_name || 'N/A'}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        ${new Date(rental.start_date).toLocaleDateString()}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        ${new Date(rental.end_date).toLocaleDateString()}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">KES ${rental.total_price}</td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${rental.status === 'active' ? 'bg-green-100 text-green-800' :
                rental.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                    rental.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'}">
                                            ${rental.status}
                                        </span>
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

// Reviews route - detailed view with stats
app.get('/reviews', (req, res) => {
    try {
        const reviews = db.prepare(`
            SELECT r.*, 
                   c.make || ' ' || c.model as car_name,
                   u.email as reviewer_email,
                   u.first_name || ' ' || u.last_name as reviewer_name
            FROM reviews r
            LEFT JOIN cars c ON r.car_id = c.id
            LEFT JOIN users u ON r.reviewer_id = u.id
            ORDER BY r.created_at DESC
        `).all();

        const totalReviews = reviews.length;
        const avgRating = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : 0;
        const fiveStarReviews = reviews.filter(r => r.rating === 5).length;

        const content = `
            <div class="mb-6">
                <h2 class="text-2xl font-bold text-gray-800 mb-4">
                    <i class="fas fa-star text-pink-500 mr-2"></i>Reviews Management
                </h2>
                
                <!-- Stats Cards -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div class="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
                        <p class="text-sm text-gray-600">Total Reviews</p>
                        <p class="text-2xl font-bold text-gray-900">${totalReviews}</p>
                    </div>
                    <div class="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
                        <p class="text-sm text-gray-600">Average Rating</p>
                        <p class="text-2xl font-bold text-gray-900">${avgRating} ⭐</p>
                    </div>
                    <div class="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
                        <p class="text-sm text-gray-600">5-Star Reviews</p>
                        <p class="text-2xl font-bold text-gray-900">${fiveStarReviews}</p>
                    </div>
                </div>
            </div>

            <div class="bg-white shadow overflow-hidden border border-gray-200 rounded-lg">
                <div class="table-container overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Car</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reviewer</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Comment</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${reviews.map(review => `
                                <tr class="hover:bg-gray-50">
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${review.id}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${review.car_name || 'N/A'}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${review.reviewer_name || 'N/A'}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        ${'⭐'.repeat(review.rating)}
                                    </td>
                                    <td class="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                                        ${review.comment || '<span class="text-gray-400 italic">No comment</span>'}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        ${new Date(review.created_at).toLocaleDateString()}
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
