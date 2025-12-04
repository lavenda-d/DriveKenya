import express from 'express';
import { body, query as expressQuery, validationResult } from 'express-validator';
import { query } from '../config/database-sqlite.js';
import { authenticateToken, requireVerified } from '../middleware/auth.js';

const router = express.Router();

// Validation middleware
const validateCar = [
  body('make').trim().isLength({ min: 1, max: 100 }).withMessage('Make is required'),
  body('model').trim().isLength({ min: 1, max: 100 }).withMessage('Model is required'),
  body('year').isInt({ min: 1990, max: new Date().getFullYear() + 1 }).withMessage('Valid year is required'),
  body('location').trim().isLength({ min: 1, max: 255 }).withMessage('Location is required'),
  body('price_per_day').isFloat({ min: 0.01 }).withMessage('Valid daily rate is required'),
];

// Get all available cars (public)
router.get('/', async (req, res, next) => {
  try {
    const {
      location,
      minPrice,
      maxPrice,
      page = 1,
      limit = 12,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    let queryText = `
      SELECT c.*
      FROM cars c
      WHERE c.available = true
    `;

    const queryParams = [];
    let paramCount = 0;

    // Apply filters
    if (location) {
      paramCount++;
      queryText += ` AND LOWER(c.location) LIKE LOWER(?)`;
      queryParams.push(`%${location}%`);
    }

    if (minPrice) {
      paramCount++;
      queryText += ` AND c.price_per_day >= ?`;
      queryParams.push(parseFloat(minPrice));
    }

    if (maxPrice) {
      paramCount++;
      queryText += ` AND c.price_per_day <= ?`;
      queryParams.push(parseFloat(maxPrice));
    }

    // Add sorting
    const validSortFields = ['created_at', 'price_per_day', 'make', 'model'];
    const validSortOrders = ['asc', 'desc'];

    if (validSortFields.includes(sortBy) && validSortOrders.includes(sortOrder.toLowerCase())) {
      queryText += ` ORDER BY c.${sortBy} ${sortOrder.toUpperCase()}`;
    } else {
      queryText += ` ORDER BY c.created_at DESC`;
    }

    // Add pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    queryText += ` LIMIT ?`;
    queryParams.push(parseInt(limit));

    queryText += ` OFFSET ?`;
    queryParams.push(offset);

    const result = query(queryText, queryParams);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM cars c
      WHERE c.available = 1
    `;

    const countParams = [];
    let countParamCount = 0;

    // Apply same filters to count query
    if (location) {
      countParamCount++;
      countQuery += ` AND LOWER(c.location) LIKE LOWER(?)`;
      countParams.push(`%${location}%`);
    }

    if (minPrice) {
      countParamCount++;
      countQuery += ` AND c.price_per_day >= ?`;
      countParams.push(parseFloat(minPrice));
    }

    if (maxPrice) {
      countParamCount++;
      countQuery += ` AND c.price_per_day <= ?`;
      countParams.push(parseFloat(maxPrice));
    }

    const countResult = query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: {
        cars: result.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// Get single car by ID (public)
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = query(`
      SELECT c.*, u.first_name || ' ' || u.last_name as owner_name, u.phone as owner_phone, u.email as owner_email
      FROM cars c
      JOIN users u ON c.host_id = u.id
      WHERE c.id = ? AND c.available = 1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Car not found'
      });
    }

    // Get recent reviews for this car
    const reviewsResult = query(`
      SELECT r.*, u.first_name || ' ' || u.last_name as reviewer_name
      FROM reviews r
      JOIN users u ON r.reviewer_id = u.id
      WHERE r.car_id = ?
      ORDER BY r.created_at DESC
      LIMIT 10
    `, [id]);

    // Get car images
    const imagesResult = query(`
      SELECT * FROM car_images 
      WHERE car_id = ? 
      ORDER BY display_order ASC
    `, [id]);

    // Get car specs
    const specsResult = query(`
      SELECT * FROM car_specs 
      WHERE car_id = ? 
      ORDER BY category, spec_key
    `, [id]);

    // Group specs by category
    const groupedSpecs = specsResult.rows.reduce((acc, spec) => {
      if (!acc[spec.category]) {
        acc[spec.category] = [];
      }
      acc[spec.category].push({
        id: spec.id,
        key: spec.spec_key,
        value: spec.spec_value
      });
      return acc;
    }, {});

    const car = result.rows[0];
    car.recent_reviews = reviewsResult.rows;
    car.car_images = imagesResult.rows;
    car.car_specs = specsResult.rows;
    car.specs_grouped = groupedSpecs;

    res.json({
      success: true,
      data: { car }
    });

  } catch (error) {
    next(error);
  }
});

// Create new car (authenticated users only)
router.post('/', authenticateToken, requireVerified, validateCar, async (req, res, next) => {
  try {
    console.log('🚗 Backend received car data:', req.body);
    console.log('🔍 Keys in req.body:', Object.keys(req.body));
    console.log('📝 req.body.make:', req.body.make);
    console.log('📝 req.body.model:', req.body.model);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Backend validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      make,
      model,
      year,
      location,
      description,
      features = [],
      images = [],
      price_per_day,
      color
    } = req.body;

    const result = query(`
      INSERT INTO cars (
        host_id, make, model, year, color, location, description, features, 
        images, price_per_day, license_plate
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      req.user.id, make, model, year, color || '', location, description || '',
      JSON.stringify(features || []), JSON.stringify(images || []), price_per_day,
      `${make}-${model}-${Date.now()}` // Generate license plate
    ]);

    res.status(201).json({
      success: true,
      message: 'Car created successfully',
      data: { car: result.rows[0] }
    });

  } catch (error) {
    next(error);
  }
});

// Update car (owner only)
router.put('/:id', authenticateToken, requireVerified, validateCar, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;

    // Check if car exists and user is owner
    const carResult = query(
      'SELECT owner_id FROM cars WHERE id = ? AND is_active = true',
      [id]
    );

    if (carResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Car not found'
      });
    }

    if (carResult.rows[0].owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - you can only update your own cars'
      });
    }

    const {
      make,
      model,
      year,
      location,
      description,
      features,
      images,
      hourlyRate,
      dailyRate,
      weeklyRate,
      category,
      fuelType,
      transmission,
      seats,
      licensePlate,
      status
    } = req.body;

    const result = query(`
      UPDATE cars SET
        make = ?, model = ?, year = ?, location = ?, description = ?,
        features = ?, images = ?, price_per_day = ?, color = ?,
        license_plate = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      id, make, model, year, location, description, features, images,
      hourlyRate, dailyRate, weeklyRate, category, fuelType, transmission,
      seats, licensePlate, status
    ]);

    res.json({
      success: true,
      message: 'Car updated successfully',
      data: { car: result.rows[0] }
    });

  } catch (error) {
    next(error);
  }
});

// Delete car (owner only)
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if car exists and user is owner
    const carResult = query(
      'SELECT host_id FROM cars WHERE id = ? AND available = 1',
      [id]
    );

    if (carResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Car not found'
      });
    }

    if (carResult.rows[0].host_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - you can only delete your own cars'
      });
    }

    // Soft delete (mark as inactive)
    query(
      'UPDATE cars SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Car deleted successfully'
    });

  } catch (error) {
    next(error);
  }
});

// Add a new car (authenticated users)
router.post('/add', [
  authenticateToken,
  body('make').trim().isLength({ min: 1, max: 100 }).withMessage('Car make is required'),
  body('model').trim().isLength({ min: 1, max: 100 }).withMessage('Car model is required'),
  body('year').isInt({ min: 1990, max: new Date().getFullYear() + 1 }).withMessage('Valid year is required'),
  body('color').trim().isLength({ min: 1, max: 50 }).withMessage('Car color is required'),
  body('price_per_day').isFloat({ min: 0.01 }).withMessage('Valid price per day is required'),
  body('location').trim().isLength({ min: 1, max: 255 }).withMessage('Location is required'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description too long'),
  body('features').optional().isArray().withMessage('Features must be an array'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { make, model, year, color, price_per_day, location, description, features } = req.body;

    // Generate a random license plate for now
    const generateLicensePlate = () => {
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const numbers = '0123456789';
      const prefix = 'KC' + letters.charAt(Math.floor(Math.random() * letters.length));
      const suffix = Array.from({ length: 3 }, () => numbers.charAt(Math.floor(Math.random() * numbers.length))).join('');
      const letter = letters.charAt(Math.floor(Math.random() * letters.length));
      return `${prefix} ${suffix}${letter}`;
    };

    const result = query(`
      INSERT INTO cars (
        host_id, make, model, year, color, license_plate, 
        price_per_day, location, description, features, 
        images, available, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
    `, [
      req.user.id,
      make,
      model,
      parseInt(year),
      color,
      generateLicensePlate(),
      parseFloat(price_per_day),
      location,
      description || `${make} ${model} ${year} - Reliable and comfortable vehicle`,
      JSON.stringify(features || ['Air Conditioning', 'Bluetooth']),
      JSON.stringify([`https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800`])
    ]);

    // Get the created car
    const newCar = query(`
      SELECT * FROM cars WHERE id = last_insert_rowid()
    `);

    res.status(201).json({
      success: true,
      message: 'Car added successfully',
      data: { car: newCar.rows[0] }
    });

  } catch (error) {
    console.error('Add car error:', error);
    next(error);
  }
});

// Get user's cars (authenticated)
router.get('/my/cars', authenticateToken, async (req, res, next) => {
  try {
    const result = query(`
      SELECT * FROM cars
      WHERE host_id = ? AND available = 1
      ORDER BY created_at DESC
    `, [req.user.id]);

    res.json({
      success: true,
      data: { cars: result.rows }
    });

  } catch (error) {
    next(error);
  }
});

// Get cars owned by the authenticated user
router.get('/my-cars', authenticateToken, requireVerified, async (req, res, next) => {
  try {
    const result = query(
      'SELECT * FROM cars WHERE host_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );

    const cars = result.rows.map(car => ({
      id: car.id,
      make: car.make,
      model: car.model,
      year: car.year,
      color: car.color,
      price_per_day: car.price_per_day,
      location: car.location,
      description: car.description,
      features: JSON.parse(car.features || '[]'),
      images: JSON.parse(car.images || '[]'),
      available: car.available === 1,
      license_plate: car.license_plate,
      owner_name: car.owner_name,
      owner_email: car.owner_email,
      owner_phone: car.owner_phone,
      created_at: car.created_at,
      updated_at: car.updated_at
    }));

    res.json({
      success: true,
      message: `Found ${cars.length} cars`,
      data: { cars }
    });

  } catch (error) {
    next(error);
  }
});

// ============================================
// ENHANCED IMAGE MANAGEMENT ENDPOINTS
// ============================================

import { uploadMultipleImages } from '../middleware/upload.js';
import { getImageUrls, deleteImage, isValidImageType } from '../services/imageService.js';

// Upload multiple images for a car
router.post('/:id/images', authenticateToken, uploadMultipleImages, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { imageType = 'standard' } = req.body;

    // Verify car exists and user is owner
    const carResult = query('SELECT host_id FROM cars WHERE id = ?', [id]);
    if (carResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Car not found' });
    }

    if (carResult.rows[0].host_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Validate image type
    if (!isValidImageType(imageType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image type. Must be: standard, 360, interior, or exterior'
      });
    }

    // Get uploaded file URLs
    const imageUrls = getImageUrls(req.files);

    if (imageUrls.length === 0) {
      return res.status(400).json({ success: false, message: 'No images uploaded' });
    }

    // Get current max display order
    const maxOrderResult = query(
      'SELECT MAX(display_order) as max_order FROM car_images WHERE car_id = ?',
      [id]
    );
    let nextOrder = (maxOrderResult.rows[0]?.max_order || 0) + 1;

    // Insert images into database
    const insertedImages = [];
    for (const imageUrl of imageUrls) {
      const result = query(`
        INSERT INTO car_images (car_id, image_url, image_type, display_order, is_primary)
        VALUES (?, ?, ?, ?, ?)
      `, [id, imageUrl, imageType, nextOrder, false]);

      insertedImages.push({
        id: result.insertId,
        car_id: id,
        image_url: imageUrl,
        image_type: imageType,
        display_order: nextOrder,
        is_primary: false
      });
      nextOrder++;
    }

    res.status(201).json({
      success: true,
      message: `${imageUrls.length} image(s) uploaded successfully`,
      data: { images: insertedImages }
    });

  } catch (error) {
    next(error);
  }
});

// Get all images for a car
router.get('/:id/images', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = query(`
      SELECT * FROM car_images 
      WHERE car_id = ? 
      ORDER BY display_order ASC
    `, [id]);

    res.json({
      success: true,
      data: { images: result.rows }
    });

  } catch (error) {
    next(error);
  }
});

// Delete a specific image
router.delete('/:id/images/:imageId', authenticateToken, async (req, res, next) => {
  try {
    const { id, imageId } = req.params;

    // Verify car ownership
    const carResult = query('SELECT host_id FROM cars WHERE id = ?', [id]);
    if (carResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Car not found' });
    }

    if (carResult.rows[0].host_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Get image info
    const imageResult = query('SELECT * FROM car_images WHERE id = ? AND car_id = ?', [imageId, id]);
    if (imageResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Image not found' });
    }

    const image = imageResult.rows[0];

    // Delete from filesystem
    deleteImage(image.image_url);

    // Delete from database
    query('DELETE FROM car_images WHERE id = ?', [imageId]);

    res.json({
      success: true,
      message: 'Image deleted successfully'
    });

  } catch (error) {
    next(error);
  }
});

// Reorder images
router.put('/:id/images/reorder', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { imageOrders } = req.body; // Array of { imageId, displayOrder }

    // Verify car ownership
    const carResult = query('SELECT host_id FROM cars WHERE id = ?', [id]);
    if (carResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Car not found' });
    }

    if (carResult.rows[0].host_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (!Array.isArray(imageOrders)) {
      return res.status(400).json({ success: false, message: 'imageOrders must be an array' });
    }

    // Update display orders
    for (const { imageId, displayOrder } of imageOrders) {
      query(
        'UPDATE car_images SET display_order = ? WHERE id = ? AND car_id = ?',
        [displayOrder, imageId, id]
      );
    }

    res.json({
      success: true,
      message: 'Images reordered successfully'
    });

  } catch (error) {
    next(error);
  }
});

// Set primary image
router.put('/:id/images/:imageId/primary', authenticateToken, async (req, res, next) => {
  try {
    const { id, imageId } = req.params;

    // Verify car ownership
    const carResult = query('SELECT host_id FROM cars WHERE id = ?', [id]);
    if (carResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Car not found' });
    }

    if (carResult.rows[0].host_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Unset all primary images for this car
    query('UPDATE car_images SET is_primary = 0 WHERE car_id = ?', [id]);

    // Set new primary image
    query('UPDATE car_images SET is_primary = 1 WHERE id = ? AND car_id = ?', [imageId, id]);

    res.json({
      success: true,
      message: 'Primary image updated successfully'
    });

  } catch (error) {
    next(error);
  }
});

// ============================================
// CAR SPECIFICATIONS ENDPOINTS
// ============================================

import { isValidSpecCategory } from '../services/imageService.js';

// Add or update car specifications
router.post('/:id/specs', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { specs } = req.body; // Array of { category, spec_key, spec_value }

    // Verify car ownership
    const carResult = query('SELECT host_id FROM cars WHERE id = ?', [id]);
    if (carResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Car not found' });
    }

    if (carResult.rows[0].host_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (!Array.isArray(specs)) {
      return res.status(400).json({ success: false, message: 'specs must be an array' });
    }

    // Validate and insert specs
    const insertedSpecs = [];
    for (const spec of specs) {
      const { category, spec_key, spec_value } = spec;

      if (!isValidSpecCategory(category)) {
        return res.status(400).json({
          success: false,
          message: `Invalid category: ${category}. Must be: engine, dimensions, features, safety, performance, or comfort`
        });
      }

      // Check if spec already exists
      const existingSpec = query(
        'SELECT id FROM car_specs WHERE car_id = ? AND category = ? AND spec_key = ?',
        [id, category, spec_key]
      );

      if (existingSpec.rows.length > 0) {
        // Update existing spec
        query(
          'UPDATE car_specs SET spec_value = ? WHERE id = ?',
          [spec_value, existingSpec.rows[0].id]
        );
        insertedSpecs.push({ id: existingSpec.rows[0].id, category, spec_key, spec_value });
      } else {
        // Insert new spec
        const result = query(
          'INSERT INTO car_specs (car_id, category, spec_key, spec_value) VALUES (?, ?, ?, ?)',
          [id, category, spec_key, spec_value]
        );
        insertedSpecs.push({ id: result.insertId, category, spec_key, spec_value });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Specifications saved successfully',
      data: { specs: insertedSpecs }
    });

  } catch (error) {
    next(error);
  }
});

// Get car specifications
router.get('/:id/specs', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = query(`
      SELECT * FROM car_specs 
      WHERE car_id = ? 
      ORDER BY category, spec_key
    `, [id]);

    // Group specs by category
    const groupedSpecs = result.rows.reduce((acc, spec) => {
      if (!acc[spec.category]) {
        acc[spec.category] = [];
      }
      acc[spec.category].push({
        id: spec.id,
        key: spec.spec_key,
        value: spec.spec_value
      });
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        specs: result.rows,
        grouped: groupedSpecs
      }
    });

  } catch (error) {
    next(error);
  }
});

// Delete a specification
router.delete('/:id/specs/:specId', authenticateToken, async (req, res, next) => {
  try {
    const { id, specId } = req.params;

    // Verify car ownership
    const carResult = query('SELECT host_id FROM cars WHERE id = ?', [id]);
    if (carResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Car not found' });
    }

    if (carResult.rows[0].host_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Delete spec
    query('DELETE FROM car_specs WHERE id = ? AND car_id = ?', [specId, id]);

    res.json({
      success: true,
      message: 'Specification deleted successfully'
    });

  } catch (error) {
    next(error);
  }
});

export default router;

