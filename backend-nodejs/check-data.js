import { query } from './config/database-sqlite.js';

console.log('=== CARS AND OWNERS ===');
const carsResult = query('SELECT id, make, model, host_id FROM cars LIMIT 5');
carsResult.rows.forEach(car => {
  console.log(`Car ID: ${car.id} | Name: ${car.make} ${car.model} | Owner ID: ${car.host_id}`);
});

console.log('\n=== USERS (POTENTIAL OWNERS) ===');
const usersResult = query('SELECT id, first_name, last_name, email FROM users LIMIT 5');
usersResult.rows.forEach(user => {
  console.log(`User ID: ${user.id} | Name: ${user.first_name} ${user.last_name} | Email: ${user.email}`);
});