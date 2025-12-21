// backend-nodejs/seed-database.js
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import env from './config/env.js';
import { query, transaction, createTables } from './config/database.js';

// Generate random data
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

const locations = [
  'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret',
  'Thika', 'Malindi', 'Kitale', 'Kakamega', 'Kisii'
];

// Clear existing data
const clearDatabase = async () => {
  console.log('🚀 Clearing existing data...');

  const tables = [
    'review_photos',
    'review_responses',
    'reviews',
    'car_specs',
    'car_images',
    'chat_messages',
    'chat_notifications',
    'messages',
    'rentals',
    'cars',
    'users'
  ];

  if (env.dbType === 'postgres') {
    // PostgreSQL TRUNCATE with CASCADE is efficient
    const tableString = tables.reverse().join(', ');
    await query(`TRUNCATE TABLE ${tableString} RESTART IDENTITY CASCADE`);
  } else {
    // SQLite individual deletes
    for (const table of tables) {
      try {
        await query(`DELETE FROM ${table}`);
        await query(`DELETE FROM sqlite_sequence WHERE name='${table}'`);
      } catch (error) {
        // Table might not exist
      }
    }
  }
  console.log('✅ Database cleared');
};

// Generate and insert users
const seedUsers = async (count, role = 'customer') => {
  console.log(`👥 Generating ${count} ${role} users...`);
  const users = [];

  for (let i = 1; i <= count; i++) {
    const firstName = `User${role === 'host' ? 'Host' : ''}${i}`;
    const lastName = 'Doe';
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
    const password = await bcrypt.hash('password123', 10);
    const phone = `07${Math.floor(10000000 + Math.random() * 90000000)}`;

    const result = await query(`
      INSERT INTO users (
        email, password, first_name, last_name, phone, role, 
        email_verified, is_verified, profile_completed, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      email, password, firstName, lastName, phone, role,
      1, role === 'host' ? (Math.random() > 0.2 ? 1 : 0) : 1, 1,
      getRandomDate(new Date(2023, 0, 1), new Date()).toISOString()
    ]);
    
    users.push({ id: result.insertId, email, role, first_name: firstName, last_name: lastName, phone });
  }

  return users;
};

// Generate diverse vehicles
const seedCars = async (hosts) => {
  console.log(`🚗 Generating diverse vehicles...`);
  const cars = [];

  const vehicleData = {
    car: [
      { make: 'Toyota', model: 'Corolla', year: 2022, price: 4500, color: 'Silver', category: 'economy', fuel: 'Petrol', transmission: 'Automatic' },
      { make: 'Honda', model: 'Civic', year: 2023, price: 5000, color: 'White', category: 'economy', fuel: 'Petrol', transmission: 'Automatic' },
      { make: 'Mazda', model: 'CX-5', year: 2021, price: 6000, color: 'Red', category: 'suv', fuel: 'Petrol', transmission: 'Automatic' },
      { make: 'Mercedes', model: 'C-Class', year: 2023, price: 12000, color: 'Black', category: 'luxury', fuel: 'Petrol', transmission: 'Automatic' }
    ],
    suv: [
      { make: 'Toyota', model: 'Land Cruiser Prado', year: 2023, price: 15000, color: 'Black', category: 'luxury', fuel: 'Diesel', transmission: 'Automatic' },
      { make: 'Nissan', model: 'Patrol', year: 2022, price: 14000, color: 'White', category: 'luxury', fuel: 'Petrol', transmission: 'Automatic' }
    ]
  };

  for (const [vehicleType, vList] of Object.entries(vehicleData)) {
    for (const vehicle of vList) {
      const host = hosts[Math.floor(Math.random() * hosts.length)];
      const location = locations[Math.floor(Math.random() * locations.length)];
      const licensePlate = `K${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))} ${String(Math.floor(100 + Math.random() * 900))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;

      const carResult = await query(`
        INSERT INTO cars (
          host_id, owner_name, owner_email, owner_phone, make, model, year, 
          color, license_plate, price_per_day, location, description, 
          features, images, fuel_type, transmission, category, vehicle_type, available, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        host.id, `${host.first_name} ${host.last_name}`, host.email, host.phone || '',
        vehicle.make, vehicle.model, vehicle.year, vehicle.color, licensePlate,
        vehicle.price, location, `Well-maintained ${vehicle.make} ${vehicle.model} available in ${location}`,
        JSON.stringify(['AC', 'Bluetooth', 'GPS']), 
        JSON.stringify([`https://images.unsplash.com/photo-1542281286-9e0a16bb7366?w=800`]),
        vehicle.fuel, vehicle.transmission, vehicle.category, vehicleType, 1,
        getRandomDate(new Date(2023, 0, 1), new Date()).toISOString()
      ]);

      cars.push({ id: carResult.insertId, ...vehicle, price_per_day: vehicle.price, location });
    }
  }

  console.log(`✅ Seeded ${cars.length} vehicles`);
  return cars;
};

// Main seeding function
const seedDatabase = async () => {
  try {
    console.log(`🚀 Starting database seeding for ${env.dbType}...`);

    // Ensure tables exist
    await createTables();

    // Clear existing data
    await clearDatabase();

    // Seed users
    const hosts = await seedUsers(5, 'host');
    const customers = await seedUsers(20, 'customer');

    // Seed cars
    const cars = await seedCars(hosts);

    // Seed some rentals
    console.log('📅 Generating sample rentals...');
    for (const car of cars) {
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const start = new Date();
      start.setDate(start.getDate() + getRandomInt(1, 10));
      const end = new Date(start);
      end.setDate(start.getDate() + getRandomInt(1, 5));

      await query(`
        INSERT INTO rentals (
          car_id, renter_id, start_date, end_date, total_price, status, created_at
        ) VALUES (?, ?, ?, ?, ?, 'confirmed', ?)
      `, [
        car.id, customer.id, start.toISOString().split('T')[0], end.toISOString().split('T')[0],
        car.price_per_day * 3, getRandomDate(new Date(2023, 0, 1), new Date()).toISOString()
      ]);
    }

    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();