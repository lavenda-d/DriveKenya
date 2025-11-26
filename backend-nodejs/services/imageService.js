import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Delete an image file from the filesystem
 * @param {string} imageUrl - Relative path to the image
 * @returns {boolean} - Success status
 */
export const deleteImage = (imageUrl) => {
    try {
        if (!imageUrl) return false;

        // Convert relative URL to absolute path
        const imagePath = path.join(__dirname, '..', imageUrl);

        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
            console.log(`🗑️  Deleted image: ${imageUrl}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error deleting image:', error);
        return false;
    }
};

/**
 * Delete multiple images
 * @param {Array<string>} imageUrls - Array of relative image paths
 * @returns {number} - Number of successfully deleted images
 */
export const deleteMultipleImages = (imageUrls) => {
    let deletedCount = 0;

    if (!Array.isArray(imageUrls)) return deletedCount;

    imageUrls.forEach(url => {
        if (deleteImage(url)) {
            deletedCount++;
        }
    });

    return deletedCount;
};

/**
 * Get the relative URL for an uploaded file
 * @param {object} file - Multer file object
 * @returns {string} - Relative URL
 */
export const getImageUrl = (file) => {
    if (!file) return null;
    return `/uploads/cars/${file.filename}`;
};

/**
 * Get relative URLs for multiple uploaded files
 * @param {Array<object>} files - Array of multer file objects
 * @returns {Array<string>} - Array of relative URLs
 */
export const getImageUrls = (files) => {
    if (!Array.isArray(files)) return [];
    return files.map(file => getImageUrl(file)).filter(url => url !== null);
};

/**
 * Validate image type
 * @param {string} imageType - Type of image
 * @returns {boolean} - Is valid
 */
export const isValidImageType = (imageType) => {
    const validTypes = ['standard', '360', 'interior', 'exterior'];
    return validTypes.includes(imageType);
};

/**
 * Validate spec category
 * @param {string} category - Spec category
 * @returns {boolean} - Is valid
 */
export const isValidSpecCategory = (category) => {
    const validCategories = ['engine', 'dimensions', 'features', 'safety', 'performance', 'comfort'];
    return validCategories.includes(category);
};

export default {
    deleteImage,
    deleteMultipleImages,
    getImageUrl,
    getImageUrls,
    isValidImageType,
    isValidSpecCategory
};
