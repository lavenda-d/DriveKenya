// backend-nodejs/seed-database.js
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '..', 'driveKenya.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Import table creation SQL from database-sqlite.js
import { createTables } from './config/database-sqlite.js';

// Initialize database tables with our db instance
createTables(db);

// Helper function to run queries
const query = (sql, params = []) => {
  try {
    return db.prepare(sql).all(...params);
  } catch (error) {
    console.error('Query error:', error.message);
    throw error;
  }
};

// Helper function to run insert/update/delete
const run = (sql, params = []) => {
  try {
    return db.prepare(sql).run(...params);
  } catch (error) {
    console.error('Query error:', error.message);
    throw error;
  }
};

// Clear existing data
const clearDatabase = () => {
  console.log('🚀 Clearing existing data...');
  
  // Clear data from all tables in correct order to respect foreign key constraints
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

  tables.forEach(table => {
    try {
      // Check if table exists before trying to clear it
      const tableExists = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name=?
      `).get(table);
      
      if (tableExists) {
        run(`DELETE FROM ${table};`);
        run(`DELETE FROM sqlite_sequence WHERE name='${table}';`);
      } else {
        console.log(`ℹ️ Table ${table} does not exist, skipping...`);
      }
    } catch (error) {
      console.error(`Could not clear table ${table}:`, error.message);
    }
  });
  console.log('✅ Database cleared');
};

// Generate random data
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

const carMakes = [
  'Toyota', 'Honda', 'Nissan', 'Mitsubishi', 'Subaru',
  'Mazda', 'Suzuki', 'Isuzu', 'Mercedes', 'BMW', 'Audi'
];

const carModels = {
  Toyota: ['Corolla', 'Camry', 'RAV4', 'Prado', 'Land Cruiser', 'Hilux', 'Fortuner'],
  Honda: ['Civic', 'Accord', 'CR-V', 'HR-V', 'Pilot'],
  Nissan: ['Sunny', 'X-Trail', 'Qashqai', 'Patrol', 'Navara'],
  Mitsubishi: ['Pajero', 'Outlander', 'ASX', 'L200'],
  Subaru: ['Forester', 'Outback', 'XV', 'Impreza'],
  Mazda: ['CX-5', 'CX-30', '3', '6', 'BT-50'],
  Suzuki: ['Swift', 'Vitara', 'Jimny', 'Ertiga'],
  Isuzu: ['D-Max', 'MUX'],
  Mercedes: ['C-Class', 'E-Class', 'GLE', 'GLC'],
  BMW: ['3 Series', '5 Series', 'X3', 'X5'],
  Audi: ['A3', 'A4', 'A6', 'Q3', 'Q5']
};

const locations = [
  'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 
  'Thika', 'Malindi', 'Kitale', 'Kakamega', 'Kisii'
];

const features = [
  'Air Conditioning', 'Bluetooth', 'Navigation', 'Sunroof', 'Leather Seats',
  'Backup Camera', 'Heated Seats', 'Apple CarPlay', 'Android Auto', 'Keyless Entry',
  'Cruise Control', 'Blind Spot Monitoring', 'Lane Keep Assist', 'Adaptive Cruise Control'
];

// Generate users
const generateUsers = async (count, role = 'customer') => {
  console.log(`👥 Generating ${count} ${role} users...`);
  const users = [];
  
  for (let i = 1; i <= count; i++) {
    const firstName = `User${role === 'host' ? 'Host' : ''}${i}`;
    const lastName = 'Doe';
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
    const password = await bcrypt.hash('password123', 10);
    const phone = `07${Math.floor(10000000 + Math.random() * 90000000)}`;
    
    const user = {
      email,
      password,
      first_name: firstName,
      last_name: lastName,
      phone,
      role,
      email_verified: 1, // SQLite uses 1/0 for booleans
      is_verified: role === 'host' ? (Math.random() > 0.2 ? 1 : 0) : 1,
      profile_completed: 1,
      created_at: getRandomDate(new Date(2023, 0, 1), new Date()).toISOString()
    };
    
    users.push(user);
  }
  
  return users;
};

// Insert users into database
const insertUsers = async (users) => {
  console.log(`💾 Inserting ${users.length} users...`);
  const stmt = db.prepare(`
    INSERT INTO users (
      email, password, first_name, last_name, phone, role, 
      email_verified, is_verified, profile_completed, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const insert = db.transaction((users) => {
    for (const user of users) {
      stmt.run(
        user.email,
        user.password,
        user.first_name,
        user.last_name,
        user.phone,
        user.role,
        user.email_verified,
        user.is_verified,
        user.profile_completed,
        user.created_at
      );
    }
  });
  
  insert(users);
  console.log(`✅ Inserted ${users.length} users`);
  return query('SELECT id, email, role FROM users');
};

// Generate diverse vehicles (cars, motorcycles, bicycles, vans, trucks, SUVs, buses)
const generateCars = (hosts) => {
  console.log(`🚗 Generating diverse vehicles...`);
  const cars = [];
  
  // Vehicle data organized by type
  const vehicleData = {
    car: [
      { make: 'Toyota', model: 'Corolla', year: 2022, price: 4500, color: 'Silver', category: 'economy', fuel: 'Petrol', transmission: 'Automatic' },
      { make: 'Honda', model: 'Civic', year: 2023, price: 5000, color: 'White', category: 'economy', fuel: 'Petrol', transmission: 'Automatic' },
      { make: 'Mazda', model: 'CX-5', year: 2021, price: 6000, color: 'Red', category: 'suv', fuel: 'Petrol', transmission: 'Automatic' },
      { make: 'Mercedes', model: 'C-Class', year: 2023, price: 12000, color: 'Black', category: 'luxury', fuel: 'Petrol', transmission: 'Automatic' },
      { make: 'BMW', model: '3 Series', year: 2022, price: 11000, color: 'Blue', category: 'luxury', fuel: 'Diesel', transmission: 'Automatic' }
    ],
    motorcycle: [
      { make: 'Yamaha', model: 'YZF-R15', year: 2023, price: 1500, color: 'Blue', category: 'sport', fuel: 'Petrol', transmission: 'Manual' },
      { make: 'Honda', model: 'CB500X', year: 2022, price: 2000, color: 'Red', category: 'adventure', fuel: 'Petrol', transmission: 'Manual' },
      { make: 'Kawasaki', model: 'Ninja 400', year: 2023, price: 1800, color: 'Green', category: 'sport', fuel: 'Petrol', transmission: 'Manual' },
      { make: 'Suzuki', model: 'V-Strom 650', year: 2021, price: 2200, color: 'White', category: 'adventure', fuel: 'Petrol', transmission: 'Manual' },
      { make: 'BMW', model: 'R 1250 GS', year: 2023, price: 4000, color: 'Black', category: 'touring', fuel: 'Petrol', transmission: 'Manual' }
    ],
    bicycle: [
      { make: 'Trek', model: 'FX 3 Disc', year: 2023, price: 500, color: 'Blue', category: 'hybrid', fuel: 'None', transmission: 'Gears' },
      { make: 'Giant', model: 'Escape 3', year: 2023, price: 400, color: 'Black', category: 'fitness', fuel: 'None', transmission: 'Gears' },
      { make: 'Specialized', model: 'Sirrus X 2.0', year: 2022, price: 600, color: 'Red', category: 'urban', fuel: 'None', transmission: 'Gears' },
      { make: 'Cannondale', model: 'Quick CX 3', year: 2023, price: 550, color: 'Silver', category: 'commuter', fuel: 'None', transmission: 'Gears' },
      { make: 'Scott', model: 'Sub Sport 20', year: 2022, price: 450, color: 'Orange', category: 'hybrid', fuel: 'None', transmission: 'Gears' }
    ],
    van: [
      { make: 'Toyota', model: 'HiAce', year: 2022, price: 7000, color: 'White', category: 'passenger', fuel: 'Diesel', transmission: 'Manual' },
      { make: 'Nissan', model: 'NV350 Urvan', year: 2023, price: 6500, color: 'Silver', category: 'passenger', fuel: 'Diesel', transmission: 'Manual' },
      { make: 'Mercedes', model: 'Sprinter', year: 2023, price: 10000, color: 'White', category: 'cargo', fuel: 'Diesel', transmission: 'Automatic' },
      { make: 'Ford', model: 'Transit', year: 2021, price: 8000, color: 'Blue', category: 'passenger', fuel: 'Diesel', transmission: 'Automatic' },
      { make: 'Volkswagen', model: 'Transporter', year: 2022, price: 8500, color: 'Gray', category: 'cargo', fuel: 'Diesel', transmission: 'Manual' }
    ],
    truck: [
      { make: 'Isuzu', model: 'D-Max', year: 2023, price: 9000, color: 'White', category: 'pickup', fuel: 'Diesel', transmission: 'Manual' },
      { make: 'Toyota', model: 'Hilux', year: 2023, price: 9500, color: 'Silver', category: 'pickup', fuel: 'Diesel', transmission: 'Automatic' },
      { make: 'Mitsubishi', model: 'L200', year: 2022, price: 8500, color: 'Black', category: 'pickup', fuel: 'Diesel', transmission: 'Manual' },
      { make: 'Ford', model: 'Ranger', year: 2023, price: 10000, color: 'Blue', category: 'pickup', fuel: 'Diesel', transmission: 'Automatic' },
      { make: 'Nissan', model: 'Navara', year: 2022, price: 8800, color: 'Red', category: 'pickup', fuel: 'Diesel', transmission: 'Manual' }
    ],
    suv: [
      { make: 'Toyota', model: 'Land Cruiser Prado', year: 2023, price: 15000, color: 'Black', category: 'luxury', fuel: 'Diesel', transmission: 'Automatic' },
      { make: 'Nissan', model: 'Patrol', year: 2022, price: 14000, color: 'White', category: 'luxury', fuel: 'Petrol', transmission: 'Automatic' },
      { make: 'Mitsubishi', model: 'Pajero', year: 2023, price: 12000, color: 'Silver', category: 'adventure', fuel: 'Diesel', transmission: 'Automatic' },
      { make: 'Land Rover', model: 'Discovery', year: 2022, price: 18000, color: 'Gray', category: 'luxury', fuel: 'Diesel', transmission: 'Automatic' },
      { make: 'Toyota', model: 'Fortuner', year: 2023, price: 11000, color: 'Brown', category: 'family', fuel: 'Diesel', transmission: 'Automatic' }
    ],
    bus: [
      { make: 'Toyota', model: 'Coaster', year: 2022, price: 12000, color: 'White', category: 'minibus', fuel: 'Diesel', transmission: 'Manual' },
      { make: 'Nissan', model: 'Civilian', year: 2023, price: 13000, color: 'Silver', category: 'minibus', fuel: 'Diesel', transmission: 'Automatic' },
      { make: 'Mercedes', model: 'Sprinter Bus', year: 2023, price: 15000, color: 'White', category: 'shuttle', fuel: 'Diesel', transmission: 'Automatic' },
      { make: 'Isuzu', model: 'NQR', year: 2021, price: 11000, color: 'Blue', category: 'shuttle', fuel: 'Diesel', transmission: 'Manual' },
      { make: 'Fuso', model: 'Rosa', year: 2022, price: 12500, color: 'White', category: 'minibus', fuel: 'Diesel', transmission: 'Manual' }
    ]
  };

  // Generate vehicles for each type
  Object.entries(vehicleData).forEach(([vehicleType, vehicles]) => {
    vehicles.forEach((vehicle, index) => {
      const host = hosts[Math.floor(Math.random() * hosts.length)];
      const location = locations[Math.floor(Math.random() * locations.length)];
      const licensePlate = `K${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))} ${String(Math.floor(100 + Math.random() * 900))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;
      
      // Vehicle-specific features
      let vehicleFeatures = [];
      if (vehicleType === 'bicycle') {
        vehicleFeatures = ['gps'];
      } else if (vehicleType === 'motorcycle') {
        vehicleFeatures = ['bluetooth', 'gps', 'usb'];
      } else if (vehicleType === 'truck' || vehicleType === 'bus') {
        vehicleFeatures = ['ac', 'bluetooth', 'gps', 'usb', 'parkingSensors', 'camera'];
      } else {
        vehicleFeatures = ['ac', 'bluetooth', 'gps', 'usb', 'sunroof', 'parkingSensors', 'camera', 'leatherSeats'].slice(0, getRandomInt(4, 8));
      }

      const car = {
        host_id: host.id,
        owner_name: `${host.first_name} ${host.last_name}`,
        owner_email: host.email,
        owner_phone: host.phone,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        color: vehicle.color,
        license_plate: licensePlate,
        price_per_day: vehicle.price,
        location,
        category: vehicle.category,
        vehicle_type: vehicleType,
        fuel_type: vehicle.fuel,
        transmission: vehicle.transmission,
        description: `${vehicle.year} ${vehicle.make} ${vehicle.model} - ${vehicleType === 'bicycle' ? 'Perfect for city commuting and exercise' : vehicleType === 'motorcycle' ? 'Thrilling ride with excellent fuel efficiency' : vehicleType === 'bus' ? 'Spacious and comfortable for group travel' : vehicleType === 'truck' ? 'Powerful and reliable for heavy-duty tasks' : vehicleType === 'van' ? 'Ideal for group trips and cargo transport' : vehicleType === 'suv' ? 'Luxurious and spacious for family adventures' : 'Well-maintained and ready for your journey'}. Available for rent in ${location}.`,
        features: JSON.stringify(vehicleFeatures),
        images: JSON.stringify([`https://source.unsplash.com/800x600/?${vehicle.make}+${vehicle.model}+${vehicleType}`]),
        available: 1,
        created_at: getRandomDate(new Date(2023, 0, 1), new Date()).toISOString()
      };
      
      cars.push(car);
    });
  });
  
  console.log(`✅ Generated ${cars.length} diverse vehicles (${Object.keys(vehicleData).map(type => `${vehicleData[type].length} ${type}s`).join(', ')})`);
  return cars;
};

// Insert cars into database
const insertCars = (cars) => {
  console.log(`💾 Inserting ${cars.length} vehicles...`);
  const stmt = db.prepare(`
    INSERT INTO cars (
      host_id, owner_name, owner_email, owner_phone, make, model, year, 
      color, license_plate, price_per_day, location, description, 
      features, images, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const insert = db.transaction((cars) => {
    for (const car of cars) {
      const result = stmt.run(
        car.host_id,
        car.owner_name,
        car.owner_email,
        car.owner_phone,
        car.make,
        car.model,
        car.year,
        car.color,
        car.license_plate,
        car.price_per_day,
        car.location,
        car.description,
        car.features,
        car.images,
        car.created_at
      );
      
      // Update the newly inserted car with additional fields if they exist
      const carId = result.lastInsertRowid;
      try {
        db.prepare(`
          UPDATE cars 
          SET fuel_type = ?, transmission = ?, category = ?, vehicle_type = ?
          WHERE id = ?
        `).run(car.fuel_type, car.transmission, car.category, car.vehicle_type, carId);
      } catch (e) {
        // Columns might not exist, that's ok
        console.log(`Note: Could not set extended fields for car ${carId}: ${e.message}`);
      }
    }
  });
  
  insert(cars);
  console.log(`✅ Inserted ${cars.length} cars`);
  return query('SELECT * FROM cars');
};

// Generate rentals (previously bookings)
const generateRentals = (users, cars) => {
  console.log('📅 Generating rentals...');
  const rentals = [];
  const statuses = ['pending', 'confirmed', 'active', 'completed', 'cancelled'];
  
  // Generate 1-3 rentals per car
  cars.forEach(car => {
    const rentalCount = getRandomInt(1, 3);
    let startDate = new Date();
    
    for (let i = 0; i < rentalCount; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      const daysToAdd = getRandomInt(1, 30);
      const duration = getRandomInt(1, 14); // 1-14 days
      
      startDate = new Date();
      startDate.setDate(startDate.getDate() + daysToAdd);
      
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + duration);
      
      // Weighted random for status (more completed rentals)
      const status = statuses[Math.random() > 0.7 ? 0 : (Math.random() > 0.3 ? 3 : 1)]; // 70% completed, 20% confirmed, 10% others
      
      const rental = {
        car_id: car.id,
        renter_id: user.id,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        total_price: car.price_per_day * duration,
        status,
        pickup_location: car.location,
        dropoff_location: car.location,
        special_requests: Math.random() > 0.7 ? 'Please have the car cleaned and full tank.' : null,
        created_at: getRandomDate(new Date(2023, 0, 1), new Date()).toISOString()
      };
      
      rentals.push(rental);
    }
  });
  
  return rentals;
};

// Insert rentals into database
const insertRentals = (rentals) => {
  console.log(`💾 Inserting ${rentals.length} rentals...`);
  const stmt = db.prepare(`
    INSERT INTO rentals (
      car_id, renter_id, start_date, end_date, total_price, status,
      pickup_location, dropoff_location, special_requests, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const insert = db.transaction((rentals) => {
    for (const rental of rentals) {
      stmt.run(
        rental.car_id,
        rental.renter_id,
        rental.start_date,
        rental.end_date,
        rental.total_price,
        rental.status,
        rental.pickup_location,
        rental.dropoff_location,
        rental.special_requests,
        rental.created_at
      );
    }
  });
  
  insert(rentals);
  console.log(`✅ Inserted ${rentals.length} rentals`);
  return query('SELECT * FROM rentals');
};

// Generate reviews
const generateReviews = (rentals, users, cars) => {
  console.log('⭐ Generating reviews...');
  const reviews = [];
  
  // Only consider completed rentals for reviews
  const completedRentals = rentals.filter(r => r.status === 'completed');
  
  completedRentals.forEach(rental => {
    // 80% chance of a review per completed rental
    if (Math.random() > 0.2) {
      const car = cars.find(c => c.id === rental.car_id);
      const user = users.find(u => u.id === rental.renter_id);
      
      const review = {
        rental_id: rental.id,
        reviewer_id: user.id,
        car_id: car.id,
        rating: getRandomInt(4, 5), // Mostly positive reviews (4-5 stars)
        rating_vehicle: getRandomInt(4, 5),
        rating_cleanliness: getRandomInt(4, 5),
        rating_communication: getRandomInt(4, 5),
        rating_value: getRandomInt(3, 5),
        comment: `Great experience with this ${car.make} ${car.model}. Everything was as described and the owner was very helpful. Would definitely rent again!`,
        created_at: new Date(rental.end_date).toISOString()
      };
      
      reviews.push(review);
    }
  });
  
  return reviews;
};

// Insert reviews into database
const insertReviews = (reviews) => {
  console.log(`💾 Inserting ${reviews.length} reviews...`);
  const stmt = db.prepare(`
    INSERT INTO reviews (
      rental_id, reviewer_id, car_id, rating, rating_vehicle, rating_cleanliness,
      rating_communication, rating_value, comment, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const insert = db.transaction((reviews) => {
    for (const review of reviews) {
      stmt.run(
        review.rental_id,
        review.reviewer_id,
        review.car_id,
        review.rating,
        review.rating_vehicle,
        review.rating_cleanliness,
        review.rating_communication,
        review.rating_value,
        review.comment,
        review.created_at
      );
    }
  });
  
  insert(reviews);
  console.log(`✅ Inserted ${reviews.length} reviews`);
};

// Main function to run the seed
const seedDatabase = async () => {
  try {
    console.log('🚀 Starting database seeding...');
    
    // Ensure tables exist
    console.log('🔨 Ensuring database tables exist...');
    
    // Clear existing data
    clearDatabase();
    
    // Generate and insert users
    const hosts = await generateUsers(10, 'host');
    const customers = await generateUsers(100, 'customer');
    await insertUsers([...hosts, ...customers]);
    
    // Get all users from database
    const allUsers = query('SELECT * FROM users');
    const hostUsers = allUsers.filter(u => u.role === 'host');
    const customerUsers = allUsers.filter(u => u.role === 'customer');
    
    // Generate and insert cars (3-5 per host)
    const cars = generateCars(hostUsers);
    await insertCars(cars);
    
    // Get all cars from database
    const allCars = query('SELECT * FROM cars');
    
    // Generate and insert rentals
    const rentals = generateRentals(customerUsers, allCars);
    await insertRentals(rentals);
    
    // Get all rentals from database
    const allRentals = query('SELECT * FROM rentals');
    
    // Generate and insert reviews
    const reviews = generateReviews(allRentals, allUsers, allCars);
    await insertReviews(reviews);
    
    console.log('🎉 Database seeding completed successfully!');
    console.log('📊 Summary:');
    console.log(`- ${allUsers.length} users (${hostUsers.length} hosts, ${customerUsers.length} customers)`);
    console.log(`- ${allCars.length} cars`);
    console.log(`- ${allRentals.length} rentals`);
    console.log(`- ${reviews.length} reviews`);
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    db.close();
  }
};

// Run the seed
seedDatabase();