// Enhanced API Extensions with Better Error Handling
// Import this file alongside the main api.js

import { authStorage } from './api';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;

// Enhanced API request helper with timeout, retry, and better error handling
const apiRequest = async (endpoint, options = {}, retries = 2) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const isFormData = options && options.body && typeof FormData !== 'undefined' && options.body instanceof FormData;
    const defaultHeaders = isFormData ? {} : { 'Content-Type': 'application/json' };

    const config = {
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
        ...options,
    };

    // Add timeout (default 30s, 60s for file uploads)
    const timeout = options.timeout || (isFormData ? 60000 : 30000);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    config.signal = controller.signal;

    let lastError;

    // Retry logic with exponential backoff
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await fetch(url, config);
            clearTimeout(timeoutId);

            // Parse response
            let data;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = { message: await response.text() };
            }

            if (!response.ok) {
                // Create detailed error message based on status code
                let errorMessage = data.message || `Request failed with status ${response.status}`;

                switch (response.status) {
                    case 400:
                        errorMessage = data.message || 'Invalid request. Please check your input.';
                        break;
                    case 401:
                        errorMessage = 'Session expired. Please login again.';
                        // Clear auth data on 401
                        authStorage.clearAuth();
                        break;
                    case 403:
                        errorMessage = 'You do not have permission to perform this action.';
                        break;
                    case 404:
                        errorMessage = 'Resource not found.';
                        break;
                    case 413:
                        errorMessage = 'File too large. Please reduce file size.';
                        break;
                    case 415:
                        errorMessage = 'Unsupported file type.';
                        break;
                    case 429:
                        errorMessage = 'Too many requests. Please try again later.';
                        break;
                    case 500:
                    case 502:
                    case 503:
                    case 504:
                        errorMessage = 'Server error. Please try again later.';
                        break;
                }

                const error = new Error(errorMessage);
                error.status = response.status;
                error.data = data;
                throw error;
            }

            return data;

        } catch (error) {
            clearTimeout(timeoutId);
            lastError = error;

            // Handle timeout
            if (error.name === 'AbortError') {
                throw new Error('Request timed out. Please check your connection and try again.');
            }

            // Don't retry on certain errors
            const noRetryStatuses = [400, 401, 403, 404, 415];
            if (error.status && noRetryStatuses.includes(error.status)) {
                throw error;
            }

            // Retry on network errors or 5xx errors
            if (attempt < retries) {
                const delay = 1000 * Math.pow(2, attempt); // Exponential backoff: 1s, 2s, 4s
                console.log(`Retry attempt ${attempt + 1}/${retries} for ${endpoint} after ${delay}ms`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            // Final attempt failed
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                throw new Error('Network error. Please check your internet connection.');
            }

            throw error;
        }
    }

    throw lastError;
};

// Profile Photo API with validation
export const uploadProfilePhoto = async (file, token) => {
    // Client-side validation
    if (!file) {
        throw new Error('No file provided');
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        throw new Error('File too large. Maximum size is 5MB.');
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
        throw new Error('Invalid file type. Please upload JPEG, PNG, or WebP images.');
    }

    if (!token) {
        throw new Error('Authentication required');
    }

    const formData = new FormData();
    formData.append('avatar', file); // Backend expects 'avatar' field name

    return apiRequest('/users/profile/photo', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData,
        timeout: 60000 // 60s for file upload
    });
};

// Document Verification API with validation
export const getVerificationStatus = async (token) => {
    if (!token) {
        throw new Error('Authentication required');
    }

    return apiRequest('/users/verification/status', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
};

export const uploadVerificationDocuments = async (documentType, frontImage, backImage, token) => {
    // Validation
    if (!documentType) {
        throw new Error('Document type is required');
    }

    if (!frontImage) {
        throw new Error('Front image is required');
    }

    if (!token) {
        throw new Error('Authentication required');
    }

    const maxSize = 10 * 1024 * 1024; // 10MB per file
    if (frontImage.size > maxSize) {
        throw new Error('Front image is too large. Maximum size is 10MB.');
    }

    if (backImage && backImage.size > maxSize) {
        throw new Error('Back image is too large. Maximum size is 10MB.');
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(frontImage.type.toLowerCase())) {
        throw new Error('Invalid front image type. Please upload JPEG, PNG, WebP, or PDF.');
    }

    if (backImage && !allowedTypes.includes(backImage.type.toLowerCase())) {
        throw new Error('Invalid back image type. Please upload JPEG, PNG, WebP, or PDF.');
    }

    const formData = new FormData();
    formData.append('documentType', documentType);
    formData.append('frontImage', frontImage);
    if (backImage) formData.append('backImage', backImage);

    return apiRequest('/users/verification/documents', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData,
        timeout: 90000 // 90s for multiple file uploads
    });
};

// Blackout Dates API with validation
export const getBlackoutDates = async (carId) => {
    if (!carId) {
        throw new Error('Car ID is required');
    }

    return apiRequest(`/cars/${carId}/blackout`);
};

export const createBlackoutPeriod = async (carId, data, token) => {
    // Validation
    if (!carId) {
        throw new Error('Car ID is required');
    }

    if (!data.startDate || !data.endDate) {
        throw new Error('Start date and end date are required');
    }

    // Validate dates
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date format');
    }

    if (startDate < today) {
        throw new Error('Start date cannot be in the past');
    }

    if (endDate < startDate) {
        throw new Error('End date must be after start date');
    }

    // Check if period is too long (e.g., max 1 year)
    const daysDiff = (endDate - startDate) / (1000 * 60 * 60 * 24);
    if (daysDiff > 365) {
        throw new Error('Blackout period cannot exceed 1 year');
    }

    if (!token) {
        throw new Error('Authentication required');
    }

    return apiRequest(`/cars/${carId}/blackout`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });
};

export const deleteBlackoutPeriod = async (carId, blackoutId, token) => {
    if (!carId) {
        throw new Error('Car ID is required');
    }

    if (!blackoutId) {
        throw new Error('Blackout ID is required');
    }

    if (!token) {
        throw new Error('Authentication required');
    }

    return apiRequest(`/cars/${carId}/blackout/${blackoutId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
};

// Password Change API with validation
export const changePassword = async (passwordData, token) => {
    // Validation
    if (!passwordData.currentPassword) {
        throw new Error('Current password is required');
    }

    if (!passwordData.newPassword) {
        throw new Error('New password is required');
    }

    if (passwordData.newPassword.length < 8) {
        throw new Error('New password must be at least 8 characters long');
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
        throw new Error('New password must be different from current password');
    }

    if (!token) {
        throw new Error('Authentication required');
    }

    return apiRequest('/auth/change-password', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(passwordData)
    });
};

export default {
    uploadProfilePhoto,
    getVerificationStatus,
    uploadVerificationDocuments,
    getBlackoutDates,
    createBlackoutPeriod,
    deleteBlackoutPeriod,
    changePassword
};
