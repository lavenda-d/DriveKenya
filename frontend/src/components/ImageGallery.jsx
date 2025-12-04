import { useState, useEffect } from 'react';
import enhancedCarsAPI from '../services/enhancedCarsAPI';
import { LoadingSpinner, ErrorDisplay, EmptyState } from './UIUtils';

const ImageGallery = ({ carId, onImageClick }) => {
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);
    const [filter, setFilter] = useState('all');
    const [lightboxIndex, setLightboxIndex] = useState(0);

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

    const filteredImages = filter === 'all'
        ? images
        : images.filter(img => img.image_type === filter);

    const handleImageClick = (image, index) => {
        setSelectedImage(image);
        setLightboxIndex(index);
        if (onImageClick) onImageClick(image);
    };

    const closeLightbox = () => {
        setSelectedImage(null);
    };

    const navigateLightbox = (direction) => {
        const newIndex = lightboxIndex + direction;
        if (newIndex >= 0 && newIndex < filteredImages.length) {
            setLightboxIndex(newIndex);
            setSelectedImage(filteredImages[newIndex]);
        }
    };

    // Keyboard navigation for lightbox
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!selectedImage) return;

            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowLeft') navigateLightbox(-1);
            if (e.key === 'ArrowRight') navigateLightbox(1);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedImage, lightboxIndex, filteredImages]);

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
                title="No images yet"
                message="Upload some images to showcase this car"
            />
        );
    }

    const imageTypeIcons = {
        standard: '📷',
        '360': '🔄',
        interior: '🪑',
        exterior: '🚗'
    };

    return (
        <div className="space-y-4">
            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
                {['all', 'standard', '360', 'interior', 'exterior'].map(type => {
                    const count = type === 'all' ? images.length : images.filter(img => img.image_type === type).length;
                    if (count === 0 && type !== 'all') return null;

                    return (
                        <button
                            key={type}
                            onClick={() => setFilter(type)}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${filter === type
                                    ? 'bg-blue-500 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            {imageTypeIcons[type] || '📁'} {type.charAt(0).toUpperCase() + type.slice(1)} ({count})
                        </button>
                    );
                })}
            </div>

            {/* Image Grid */}
            {filteredImages.length === 0 ? (
                <EmptyState
                    icon={imageTypeIcons[filter]}
                    title={`No ${filter} images`}
                    message={`Upload ${filter} images to see them here`}
                />
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredImages.map((img, index) => (
                        <div
                            key={img.id}
                            onClick={() => handleImageClick(img, index)}
                            className={`relative group cursor-pointer overflow-hidden rounded-lg transition-all hover:scale-105 hover:shadow-xl ${img.is_primary ? 'ring-4 ring-blue-500' : ''
                                }`}
                        >
                            <img
                                src={img.image_url}
                                alt={`${img.image_type} view`}
                                className="w-full h-48 object-cover"
                                loading="lazy"
                            />

                            {/* Overlay */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                                <span className="text-white text-4xl opacity-0 group-hover:opacity-100 transition-opacity">
                                    🔍
                                </span>
                            </div>

                            {/* Primary Badge */}
                            {img.is_primary && (
                                <div className="absolute top-2 left-2 bg-blue-500 text-white px-3 py-1 text-xs font-semibold rounded-full flex items-center shadow-lg">
                                    ⭐ Primary
                                </div>
                            )}

                            {/* Type Badge */}
                            <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 text-xs rounded flex items-center backdrop-blur-sm">
                                {imageTypeIcons[img.image_type]} {img.image_type}
                            </div>

                            {/* Order Badge */}
                            <div className="absolute top-2 right-2 bg-gray-800/70 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold backdrop-blur-sm">
                                {img.display_order}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Enhanced Lightbox Modal */}
            {selectedImage && (
                <div
                    className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 animate-fade-in"
                    onClick={closeLightbox}
                >
                    {/* Close Button */}
                    <button
                        onClick={closeLightbox}
                        className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300 transition-colors bg-black/50 rounded-full w-12 h-12 flex items-center justify-center hover:bg-black/70"
                        title="Close (Esc)"
                    >
                        ×
                    </button>

                    {/* Navigation Buttons */}
                    {lightboxIndex > 0 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); navigateLightbox(-1); }}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-4xl hover:text-gray-300 transition-colors bg-black/50 rounded-full w-12 h-12 flex items-center justify-center hover:bg-black/70"
                            title="Previous (←)"
                        >
                            ‹
                        </button>
                    )}

                    {lightboxIndex < filteredImages.length - 1 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); navigateLightbox(1); }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-4xl hover:text-gray-300 transition-colors bg-black/50 rounded-full w-12 h-12 flex items-center justify-center hover:bg-black/70"
                            title="Next (→)"
                        >
                            ›
                        </button>
                    )}

                    {/* Image Container */}
                    <div className="max-w-6xl max-h-full" onClick={(e) => e.stopPropagation()}>
                        <img
                            src={selectedImage.image_url}
                            alt={`${selectedImage.image_type} view`}
                            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                        />

                        {/* Image Info */}
                        <div className="text-white text-center mt-4 bg-black/50 rounded-lg p-4 backdrop-blur-sm">
                            <p className="text-lg font-semibold">
                                {imageTypeIcons[selectedImage.image_type]} {selectedImage.image_type.charAt(0).toUpperCase() + selectedImage.image_type.slice(1)} View
                            </p>
                            <p className="text-sm text-gray-300 mt-1">
                                Image {lightboxIndex + 1} of {filteredImages.length}
                            </p>
                            {selectedImage.is_primary && (
                                <p className="text-sm text-blue-400 mt-1">⭐ Primary Image</p>
                            )}
                        </div>
                    </div>

                    {/* Keyboard Hints */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-xs bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm">
                        Use ← → to navigate • ESC to close
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImageGallery;
