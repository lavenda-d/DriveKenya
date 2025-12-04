import { useState } from 'react';
import enhancedCarsAPI from '../services/enhancedCarsAPI';
import { useToast, LoadingSpinner, ErrorDisplay, ProgressBar } from './UIUtils';

const ImageUploader = ({ carId, token, onUploadComplete }) => {
    const [files, setFiles] = useState([]);
    const [imageType, setImageType] = useState('standard');
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [previews, setPreviews] = useState([]);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState(null);
    const { showToast, ToastContainer } = useToast();

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const MAX_FILES = 20;

    const validateFiles = (fileList) => {
        const errors = [];

        if (fileList.length > MAX_FILES) {
            errors.push(`Maximum ${MAX_FILES} images allowed`);
        }

        fileList.forEach((file, index) => {
            if (!file.type.startsWith('image/')) {
                errors.push(`File ${index + 1} is not an image`);
            }
            if (file.size > MAX_FILE_SIZE) {
                errors.push(`File ${index + 1} exceeds 5MB limit`);
            }
        });

        return errors;
    };

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        const errors = validateFiles(selectedFiles);

        if (errors.length > 0) {
            setError(errors.join('. '));
            showToast(errors[0], 'error');
            return;
        }

        setError(null);
        setFiles(selectedFiles);
        generatePreviews(selectedFiles);
    };

    const generatePreviews = (fileList) => {
        const previewUrls = fileList.map(file => URL.createObjectURL(file));
        setPreviews(previewUrls);
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

        const droppedFiles = Array.from(e.dataTransfer.files).filter(file =>
            file.type.startsWith('image/')
        );

        const errors = validateFiles(droppedFiles);
        if (errors.length > 0) {
            setError(errors.join('. '));
            showToast(errors[0], 'error');
            return;
        }

        setError(null);
        setFiles(droppedFiles);
        generatePreviews(droppedFiles);
    };

    const handleUpload = async () => {
        if (files.length === 0) return;

        const formData = new FormData();
        files.forEach(file => formData.append('images', file));
        formData.append('imageType', imageType);

        setUploading(true);
        setUploadProgress(0);
        setError(null);

        try {
            // Simulate progress (in real app, use XMLHttpRequest for actual progress)
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => Math.min(prev + 10, 90));
            }, 200);

            const response = await enhancedCarsAPI.uploadCarImages(carId, formData, token);

            clearInterval(progressInterval);
            setUploadProgress(100);

            showToast(`Successfully uploaded ${files.length} image(s)!`, 'success');

            // Clean up
            setTimeout(() => {
                setFiles([]);
                setPreviews([]);
                setUploadProgress(0);
                if (onUploadComplete) onUploadComplete();
            }, 1000);

        } catch (error) {
            setError(error.message || 'Upload failed');
            showToast('Upload failed: ' + error.message, 'error');
            setUploadProgress(0);
        } finally {
            setUploading(false);
        }
    };

    const removeFile = (index) => {
        const newFiles = files.filter((_, i) => i !== index);
        const newPreviews = previews.filter((_, i) => i !== index);
        setFiles(newFiles);
        setPreviews(newPreviews);
        URL.revokeObjectURL(previews[index]); // Clean up memory
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
            <ToastContainer />

            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800">📸 Upload Car Images</h3>
                <span className="text-sm text-gray-500">Max {MAX_FILES} images, 5MB each</span>
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-start">
                    <span className="text-lg mr-2">⚠️</span>
                    <span>{error}</span>
                </div>
            )}

            {/* Image Type Selector */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Image Type
                </label>
                <select
                    value={imageType}
                    onChange={(e) => setImageType(e.target.value)}
                    disabled={uploading}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                    <option value="standard">📷 Standard Photos</option>
                    <option value="360">🔄 360° View</option>
                    <option value="interior">🪑 Interior</option>
                    <option value="exterior">🚗 Exterior</option>
                </select>
            </div>

            {/* Drag & Drop Zone */}
            <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${dragActive
                        ? 'border-blue-500 bg-blue-50 scale-105'
                        : 'border-gray-300 hover:border-gray-400'
                    } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
            >
                <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                    disabled={uploading}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                    <div className="text-6xl mb-4">📁</div>
                    <p className="text-lg font-semibold text-gray-700 mb-2">
                        Drag & drop images here
                    </p>
                    <p className="text-sm text-gray-500 mb-4">
                        or click to browse • JPEG, PNG, WebP
                    </p>
                    <button
                        type="button"
                        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                        disabled={uploading}
                    >
                        Choose Files
                    </button>
                </label>
            </div>

            {/* Upload Progress */}
            {uploading && uploadProgress > 0 && (
                <ProgressBar progress={uploadProgress} label="Uploading images..." />
            )}

            {/* Preview Grid */}
            {previews.length > 0 && !uploading && (
                <div>
                    <h4 className="font-semibold text-gray-700 mb-3">
                        Selected Images ({files.length}/{MAX_FILES})
                    </h4>
                    <div className="grid grid-cols-4 gap-4">
                        {previews.map((preview, index) => (
                            <div key={index} className="relative group">
                                <img
                                    src={preview}
                                    alt={`Preview ${index + 1}`}
                                    className="w-full h-32 object-cover rounded-lg"
                                />
                                <button
                                    onClick={() => removeFile(index)}
                                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                    title="Remove image"
                                >
                                    ×
                                </button>
                                <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                                    {(files[index].size / 1024 / 1024).toFixed(2)} MB
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Upload Button */}
            <button
                onClick={handleUpload}
                disabled={uploading || files.length === 0}
                className={`w-full py-3 rounded-lg font-semibold transition-all ${uploading || files.length === 0
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
                        Uploading {uploadProgress}%...
                    </span>
                ) : (
                    `Upload ${files.length} Image${files.length !== 1 ? 's' : ''}`
                )}
            </button>
        </div>
    );
};

export default ImageUploader;
