import { useState, useEffect } from 'react';
import enhancedCarsAPI from '../services/enhancedCarsAPI';
import { useToast, LoadingSpinner, ErrorDisplay, EmptyState, ConfirmDialog } from './UIUtils';

const ImageManager = ({ carId, token, onUpdate }) => {
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [draggedImage, setDraggedImage] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [processing, setProcessing] = useState(false);
    const { showToast, ToastContainer } = useToast();

    useEffect(() => {
        loadImages();
    }, [carId]);

    const loadImages = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await enhancedCarsAPI.getCarImages(carId);
            setImages(response.data.images);
        } catch (error) {
            console.error('Failed to load images:', error);
            setError(error.message || 'Failed to load images');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (imageId) => {
        setProcessing(true);
        try {
            await enhancedCarsAPI.deleteCarImage(carId, imageId, token);
            showToast('Image deleted successfully', 'success');
            loadImages();
            if (onUpdate) onUpdate();
        } catch (error) {
            showToast('Failed to delete image: ' + error.message, 'error');
        } finally {
            setProcessing(false);
            setDeleteConfirm(null);
        }
    };

    const handleSetPrimary = async (imageId) => {
        setProcessing(true);
        try {
            await enhancedCarsAPI.setPrimaryImage(carId, imageId, token);
            showToast('Primary image updated', 'success');
            loadImages();
            if (onUpdate) onUpdate();
        } catch (error) {
            showToast('Failed to set primary image: ' + error.message, 'error');
        } finally {
            setProcessing(false);
        }
    };

    const handleDragStart = (e, image) => {
        setDraggedImage(image);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e, targetImage) => {
        e.preventDefault();

        if (!draggedImage || draggedImage.id === targetImage.id) return;

        setProcessing(true);

        // Create new order
        const newImages = [...images];
        const draggedIndex = newImages.findIndex(img => img.id === draggedImage.id);
        const targetIndex = newImages.findIndex(img => img.id === targetImage.id);

        // Remove dragged item and insert at new position
        const [removed] = newImages.splice(draggedIndex, 1);
        newImages.splice(targetIndex, 0, removed);

        // Update display orders
        const imageOrders = newImages.map((img, index) => ({
            imageId: img.id,
            displayOrder: index + 1
        }));

        try {
            await enhancedCarsAPI.reorderCarImages(carId, imageOrders, token);
            setImages(newImages);
            showToast('Images reordered successfully', 'success');
            if (onUpdate) onUpdate();
        } catch (error) {
            showToast('Failed to reorder images: ' + error.message, 'error');
            loadImages(); // Reload on error
        } finally {
            setProcessing(false);
        }

        setDraggedImage(null);
    };

    if (loading) {
        return <LoadingSpinner size="lg" message="Loading images..." />;
    }

    if (error) {
        return <ErrorDisplay message={error} onRetry={loadImages} />;
    }

    if (images.length === 0) {
        return (
            <EmptyState
                icon="📷"
                title="No images to manage"
                message="Upload some images first to manage them here"
            />
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <ToastContainer />

            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-xl font-bold text-gray-800">🖼️ Manage Images</h3>
                    <p className="text-sm text-gray-600 mt-1">
                        {images.length} image{images.length !== 1 ? 's' : ''} • Drag to reorder
                    </p>
                </div>
                {processing && (
                    <div className="flex items-center text-blue-600">
                        <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Processing...
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {images.map((img) => (
                    <div
                        key={img.id}
                        draggable={!processing}
                        onDragStart={(e) => handleDragStart(e, img)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, img)}
                        className={`relative group border-2 rounded-lg overflow-hidden transition-all ${processing ? 'cursor-wait' : 'cursor-move'
                            } ${img.is_primary
                                ? 'border-blue-500 shadow-lg'
                                : 'border-gray-200 hover:border-gray-300'
                            } ${draggedImage?.id === img.id ? 'opacity-50 scale-95' : 'hover:scale-105'}`}
                    >
                        {/* Image */}
                        <img
                            src={img.image_url}
                            alt={`${img.image_type} view`}
                            className="w-full h-48 object-cover"
                        />

                        {/* Overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity space-y-2 p-4">
                                {!img.is_primary && (
                                    <button
                                        onClick={() => handleSetPrimary(img.id)}
                                        disabled={processing}
                                        className="block w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                                    >
                                        ⭐ Set as Primary
                                    </button>
                                )}
                                <button
                                    onClick={() => setDeleteConfirm(img)}
                                    disabled={processing}
                                    className="block w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    🗑️ Delete
                                </button>
                            </div>
                        </div>

                        {/* Badges */}
                        {img.is_primary && (
                            <div className="absolute top-2 left-2 bg-blue-500 text-white px-3 py-1 text-xs font-semibold rounded-full shadow-lg">
                                ⭐ Primary
                            </div>
                        )}

                        <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 text-xs rounded backdrop-blur-sm">
                            {img.image_type}
                        </div>

                        <div className="absolute top-2 right-2 bg-gray-800/70 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold backdrop-blur-sm">
                            {img.display_order}
                        </div>

                        {/* Drag Handle */}
                        <div className="absolute bottom-2 right-2 bg-gray-800/70 text-white px-2 py-1 text-xs rounded flex items-center backdrop-blur-sm">
                            ⋮⋮ Drag
                        </div>
                    </div>
                ))}
            </div>

            {/* Instructions */}
            <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">💡 Tips</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Drag images to reorder them in the gallery</li>
                    <li>• The primary image appears first in car listings</li>
                    <li>• Hover over an image to see management options</li>
                    <li>• Display order determines the sequence in galleries</li>
                </ul>
            </div>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={deleteConfirm !== null}
                title="Delete Image"
                message={`Are you sure you want to delete this ${deleteConfirm?.image_type} image? This action cannot be undone.`}
                onConfirm={() => handleDelete(deleteConfirm.id)}
                onCancel={() => setDeleteConfirm(null)}
                confirmText="Delete"
                cancelText="Cancel"
                danger={true}
            />
        </div>
    );
};

export default ImageManager;
