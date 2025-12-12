import { useState, useRef } from 'react';
import { authStorage } from '../services/api';
import { uploadProfilePhoto } from '../services/apiExtensions';
import { LoadingSpinner, ErrorDisplay, useToast, ProgressBar } from './UIUtils';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const ProfilePhoto = ({ currentPhotoUrl, onPhotoUpdated }) => {
    const [preview, setPreview] = useState(currentPhotoUrl || null);
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef(null);
    const { showToast, ToastContainer } = useToast();

    const validateFile = (file) => {
        if (!file) return 'No file selected';
        if (!ALLOWED_TYPES.includes(file.type)) {
            return 'Invalid file type. Please upload JPEG, PNG, or WebP images.';
        }
        if (file.size > MAX_FILE_SIZE) {
            return 'File too large. Maximum size is 5MB.';
        }
        return null;
    };

    const handleFileSelect = (selectedFile) => {
        const validationError = validateFile(selectedFile);
        if (validationError) {
            setError(validationError);
            showToast(validationError, 'error');
            return;
        }

        setError(null);
        setFile(selectedFile);

        // Generate preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result);
        };
        reader.readAsDataURL(selectedFile);
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            handleFileSelect(selectedFile);
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile) {
            handleFileSelect(droppedFile);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            showToast('Please select a photo first', 'error');
            return;
        }

        const token = authStorage.getToken();
        if (!token) {
            showToast('Please login to upload photo', 'error');
            return;
        }

        setUploading(true);
        setProgress(0);
        setError(null);

        try {
            // Simulate progress
            const progressInterval = setInterval(() => {
                setProgress(prev => Math.min(prev + 10, 90));
            }, 200);

            // Use apiExtensions helper to upload the profile photo
            const data = await uploadProfilePhoto(file, token);
            clearInterval(progressInterval);
            setProgress(100);

            showToast('Profile photo updated successfully!', 'success');

            // Update user data in storage
            const user = authStorage.getUser();
            if (user) {
                user.profile_photo = data.photoUrl;
                authStorage.setUser(user);
            }

            // Notify parent component
            if (onPhotoUpdated) {
                onPhotoUpdated(data.photoUrl);
            }

            // Reset state
            setTimeout(() => {
                setFile(null);
                setProgress(0);
            }, 1000);

        } catch (err) {
            console.error('Upload error:', err);
            setError(err.message || 'Failed to upload photo');
            showToast(err.message || 'Upload failed', 'error');
            setProgress(0);
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = () => {
        setFile(null);
        setPreview(currentPhotoUrl || null);
        setError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
            <ToastContainer />

            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800">📸 Profile Photo</h3>
                <span className="text-sm text-gray-500">Max 5MB • JPEG, PNG, WebP</span>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-start">
                    <span className="text-lg mr-2">⚠️</span>
                    <span>{error}</span>
                </div>
            )}

            {/* Preview Area */}
            <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                    {preview ? (
                        <img
                            src={preview}
                            alt="Profile preview"
                            className="w-40 h-40 rounded-full object-cover border-4 border-gray-200 shadow-lg"
                        />
                    ) : (
                        <div className="w-40 h-40 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-6xl border-4 border-gray-300">
                            👤
                        </div>
                    )}
                    {file && (
                        <div className="absolute top-0 right-0 bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg">
                            ✓
                        </div>
                    )}
                </div>

                {/* Upload Area */}
                <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`w-full border-2 border-dashed rounded-lg p-6 text-center transition-all ${dragActive
                            ? 'border-blue-500 bg-blue-50 scale-105'
                            : 'border-gray-300 hover:border-gray-400'
                        } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileChange}
                        className="hidden"
                        id="photo-upload"
                        disabled={uploading}
                    />
                    <label htmlFor="photo-upload" className="cursor-pointer">
                        <div className="text-5xl mb-3">📁</div>
                        <p className="text-lg font-semibold text-gray-700 mb-2">
                            Drag & drop your photo here
                        </p>
                        <p className="text-sm text-gray-500 mb-4">
                            or click to browse
                        </p>
                        <button
                            type="button"
                            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                            disabled={uploading}
                        >
                            Choose Photo
                        </button>
                    </label>
                </div>

                {/* Selected File Info */}
                {file && !uploading && (
                    <div className="w-full bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <span className="text-2xl">📄</span>
                                <div>
                                    <p className="font-medium text-gray-900">{file.name}</p>
                                    <p className="text-sm text-gray-500">
                                        {(file.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleRemove}
                                className="text-red-500 hover:text-red-700 font-semibold"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                )}

                {/* Upload Progress */}
                {uploading && progress > 0 && (
                    <div className="w-full">
                        <ProgressBar progress={progress} label="Uploading photo..." />
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-3 w-full">
                    <button
                        onClick={handleUpload}
                        disabled={!file || uploading}
                        className={`flex-1 py-3 rounded-lg font-semibold transition-all ${!file || uploading
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 shadow-lg'
                            }`}
                    >
                        {uploading ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Uploading {progress}%...
                            </span>
                        ) : (
                            'Upload Photo'
                        )}
                    </button>

                    {file && !uploading && (
                        <button
                            onClick={handleRemove}
                            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </div>

            {/* Tips */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">💡 Tips</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Use a clear, recent photo of yourself</li>
                    <li>• Square photos work best (will be cropped to circle)</li>
                    <li>• Good lighting makes a big difference</li>
                    <li>• Avoid group photos or photos with sunglasses</li>
                </ul>
            </div>
        </div>
    );
};

export default ProfilePhoto;
