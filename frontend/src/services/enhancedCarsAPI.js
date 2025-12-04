// Enhanced Car Details API Extension
// This file extends the carsAPI with new methods for image management and specifications
// Import this in your components or merge with existing api.js

const API_BASE_URL = 'http://localhost:5000/api';

// Enhanced Cars API Methods
export const enhancedCarsAPI = {
    // ============================================
    // IMAGE MANAGEMENT
    // ============================================

    /**
     * Upload multiple images for a car
     * @param {string|number} carId - The car ID
     * @param {FormData} formData - FormData object containing images and imageType
     * @param {string} token - Authentication token
     * @returns {Promise} API response
     */
    uploadCarImages: async (carId, formData, token) => {
        const url = `${API_BASE_URL}/cars/${carId}/images`;
        try {
            console.log(`🌐 API Request: POST ${url}`);
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    // Don't set Content-Type for FormData - browser sets it with boundary
                },
                body: formData,
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }
            console.log(`✅ API Success: /cars/${carId}/images`, data);
            return data;
        } catch (error) {
            console.error(`❌ API Error: /cars/${carId}/images`, error);
            throw error;
        }
    },

    /**
     * Get all images for a car
     * @param {string|number} carId - The car ID
     * @returns {Promise} API response with images array
     */
    getCarImages: async (carId) => {
        const url = `${API_BASE_URL}/cars/${carId}/images`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }
            return data;
        } catch (error) {
            console.error(`❌ API Error: /cars/${carId}/images`, error);
            throw error;
        }
    },

    /**
     * Delete a specific image
     * @param {string|number} carId - The car ID
     * @param {string|number} imageId - The image ID
     * @param {string} token - Authentication token
     * @returns {Promise} API response
     */
    deleteCarImage: async (carId, imageId, token) => {
        const url = `${API_BASE_URL}/cars/${carId}/images/${imageId}`;
        try {
            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }
            return data;
        } catch (error) {
            console.error(`❌ API Error: DELETE /cars/${carId}/images/${imageId}`, error);
            throw error;
        }
    },

    /**
     * Reorder images
     * @param {string|number} carId - The car ID
     * @param {Array} imageOrders - Array of {imageId, displayOrder} objects
     * @param {string} token - Authentication token
     * @returns {Promise} API response
     */
    reorderCarImages: async (carId, imageOrders, token) => {
        const url = `${API_BASE_URL}/cars/${carId}/images/reorder`;
        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ imageOrders }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }
            return data;
        } catch (error) {
            console.error(`❌ API Error: PUT /cars/${carId}/images/reorder`, error);
            throw error;
        }
    },

    /**
     * Set primary image
     * @param {string|number} carId - The car ID
     * @param {string|number} imageId - The image ID to set as primary
     * @param {string} token - Authentication token
     * @returns {Promise} API response
     */
    setPrimaryImage: async (carId, imageId, token) => {
        const url = `${API_BASE_URL}/cars/${carId}/images/${imageId}/primary`;
        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }
            return data;
        } catch (error) {
            console.error(`❌ API Error: PUT /cars/${carId}/images/${imageId}/primary`, error);
            throw error;
        }
    },

    // ============================================
    // SPECIFICATIONS MANAGEMENT
    // ============================================

    /**
     * Add or update car specifications
     * @param {string|number} carId - The car ID
     * @param {Array} specs - Array of {category, spec_key, spec_value} objects
     * @param {string} token - Authentication token
     * @returns {Promise} API response
     */
    addCarSpecs: async (carId, specs, token) => {
        const url = `${API_BASE_URL}/cars/${carId}/specs`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ specs }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }
            return data;
        } catch (error) {
            console.error(`❌ API Error: POST /cars/${carId}/specs`, error);
            throw error;
        }
    },

    /**
     * Get car specifications
     * @param {string|number} carId - The car ID
     * @returns {Promise} API response with specs (raw and grouped)
     */
    getCarSpecs: async (carId) => {
        const url = `${API_BASE_URL}/cars/${carId}/specs`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }
            return data;
        } catch (error) {
            console.error(`❌ API Error: GET /cars/${carId}/specs`, error);
            throw error;
        }
    },

    /**
     * Delete a specification
     * @param {string|number} carId - The car ID
     * @param {string|number} specId - The spec ID to delete
     * @param {string} token - Authentication token
     * @returns {Promise} API response
     */
    deleteCarSpec: async (carId, specId, token) => {
        const url = `${API_BASE_URL}/cars/${carId}/specs/${specId}`;
        try {
            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }
            return data;
        } catch (error) {
            console.error(`❌ API Error: DELETE /cars/${carId}/specs/${specId}`, error);
            throw error;
        }
    },
};

export default enhancedCarsAPI;
