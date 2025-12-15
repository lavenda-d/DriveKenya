import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directories if they don't exist
const avatarsDir = path.join(__dirname, '..', 'uploads', 'users');
const documentsDir = path.join(__dirname, '..', 'uploads', 'documents');
[avatarsDir, documentsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Sanitize filename
const sanitizeName = (name) => name.replace(/[^a-zA-Z0-9._-]/g, '_');

// Storage for avatars
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarsDir);
  },
  filename: (req, file, cb) => {
    const userId = (req.user && req.user.id) || 'user';
    const ext = path.extname(file.originalname).toLowerCase();
    const base = `avatar_${userId}_${Date.now()}`;
    cb(null, sanitizeName(`${base}${ext}`));
  }
});

// Storage for documents
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, documentsDir);
  },
  filename: (req, file, cb) => {
    const userId = (req.user && req.user.id) || 'user';
    const ext = path.extname(file.originalname).toLowerCase();
    const base = `doc_${userId}_${Date.now()}`;
    cb(null, sanitizeName(`${base}${ext}`));
  }
});

// File filters
const imageFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const extname = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowed.test(file.mimetype);
  if (extname && mimetype) return cb(null, true);
  cb(new Error('Only image files (JPEG, PNG, WebP) are allowed'));
};

const documentFilter = (req, file, cb) => {
  const allowedExt = /jpeg|jpg|png|webp|pdf/;
  const allowedMime = /(image\/(jpeg|jpg|png|webp))|application\/pdf/;
  const extname = allowedExt.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedMime.test(file.mimetype);
  if (extname && mimetype) return cb(null, true);
  cb(new Error('Only images or PDF documents are allowed'));
};

export const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
  fileFilter: imageFilter
}).fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'photo', maxCount: 1 }
]);

export const uploadDocument = multer({
  storage: documentStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: documentFilter
});

