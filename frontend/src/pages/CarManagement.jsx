import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { carsAPI } from '../services/api';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaCar } from 'react-icons/fa';
import ImageUploader from '../components/ImageUploader';
import ImageManager from '../components/ImageManager';
import SpecsEditor from '../components/SpecsEditor';
import ImageGallery from '../components/ImageGallery';
import BlackoutManager from '../components/BlackoutManager';
import { LoadingSpinner } from '../components/UIUtils';

const CarManagement = ({ carId: propCarId, onClose }) => {
    const { id: routeId } = useParams();
    const navigate = useNavigate();
    const [car, setCar] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('upload');
    const [token, setToken] = useState(null);

    const id = propCarId || routeId;

    useEffect(() => {
        // Get token from localStorage
        const userToken = localStorage.getItem('token');
        if (!userToken) {
            toast.error('Please login to manage your cars');
            // If opened as a modal (onClose provided), close instead of navigating
            if (onClose) {
                onClose();
            } else {
                navigate('/login');
            }
            return;
        }
        setToken(userToken);
        if (id) fetchCarDetails();
    }, [id, navigate, onClose, propCarId, routeId]);

    const fetchCarDetails = async () => {
        try {
            setLoading(true);
            const response = await carsAPI.getCarById(id);
            if (response.success) {
                setCar(response.data);
            } else {
                toast.error('Failed to load car details');
                navigate('/my-cars');
            }
        } catch (error) {
            console.error('Error fetching car details:', error);
            toast.error('Error loading car details');
            navigate('/my-cars');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = () => {
        // Refresh car data after updates
        fetchCarDetails();
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <LoadingSpinner size="lg" message="Loading car details..." />
            </div>
        );
    }

    if (!car || !token) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Car Not Found</h2>
                    <p className="text-gray-600">The requested car could not be found.</p>
                    <button
                        onClick={() => navigate('/my-cars')}
                        className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Back to My Cars
                    </button>
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'upload', label: '📤 Upload Images', icon: '📤' },
        { id: 'manage', label: '🖼️ Manage Images', icon: '🖼️' },
        { id: 'specs', label: '📋 Edit Specs', icon: '📋' },
        { id: 'blackout', label: '🚫 Blackout Dates', icon: '🚫' },
        { id: 'preview', label: '👁️ Preview', icon: '👁️' }
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <button
                                onClick={() => onClose ? onClose() : navigate('/my-cars')}
                                className="mr-4 p-2 rounded-full hover:bg-gray-100"
                            >
                                <FaArrowLeft className="h-5 w-5 text-gray-600" />
                            </button>
                            <div>
                                <h1 className="text-xl font-semibold text-gray-900">
                                    Manage: {car.year} {car.make} {car.model}
                                </h1>
                                <p className="text-sm text-gray-500 mt-1">
                                    Enhance your car listing with photos and specifications
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate(`/cars/${id}`)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                        >
                            <FaCar className="mr-2" />
                            View Listing
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Tabs */}
                <div className="mb-8 border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`${activeTab === tab.id
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                            >
                                <span className="mr-2">{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="space-y-6">
                    {activeTab === 'upload' && (
                        <div>
                            <div className="mb-6">
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Car Images</h2>
                                <p className="text-gray-600">
                                    Add multiple images to showcase your car. Upload standard photos, 360° views, interior, and exterior shots.
                                </p>
                            </div>
                            <ImageUploader carId={id} token={token} onUploadComplete={handleUpdate} />
                        </div>
                    )}

                    {activeTab === 'manage' && (
                        <div>
                            <div className="mb-6">
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Manage Images</h2>
                                <p className="text-gray-600">
                                    Reorder images, set primary image, and delete unwanted photos.
                                </p>
                            </div>
                            <ImageManager carId={id} token={token} onUpdate={handleUpdate} />
                        </div>
                    )}

                    {activeTab === 'specs' && (
                        <div>
                            <div className="mb-6">
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Edit Specifications</h2>
                                <p className="text-gray-600">
                                    Add detailed specifications to help buyers understand your car's features.
                                </p>
                            </div>
                            <SpecsEditor carId={id} token={token} onUpdate={handleUpdate} />
                        </div>
                    )}

                    {activeTab === 'blackout' && (
                        <div>
                            <div className="mb-6">
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Blackout Dates</h2>
                                <p className="text-gray-600">
                                    Block dates when your car is unavailable for rent.
                                </p>
        </div>
        <BlackoutManager carId={id} />
    </div>
)}

                    {activeTab === 'preview' && (
                        <div>
                            <div className="mb-6">
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Preview Your Listing</h2>
                                <p className="text-gray-600">
                                    See how your car will appear to potential renters.
                                </p>
                            </div>

                            {/* Image Gallery Preview */}
                            <div className="mb-8">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Image Gallery</h3>
                                <ImageGallery carId={id} />
                            </div>

                            {/* Quick Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                <div className="bg-white rounded-lg shadow-sm p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-600">Total Images</p>
                                            <p className="text-3xl font-bold text-gray-900 mt-1">
                                                {car.car_images?.length || 0}
                                            </p>
                                        </div>
                                        <div className="text-4xl">📷</div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-lg shadow-sm p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-600">Specifications</p>
                                            <p className="text-3xl font-bold text-gray-900 mt-1">
                                                {car.car_specs?.length || 0}
                                            </p>
                                        </div>
                                        <div className="text-4xl">📋</div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-lg shadow-sm p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-600">Daily Rate</p>
                                            <p className="text-3xl font-bold text-gray-900 mt-1">
                                                KES {car.price_per_day?.toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="text-4xl">💰</div>
                                    </div>
                                </div>
                            </div>

                            {/* Completion Checklist */}
                            <div className="bg-white rounded-lg shadow-sm p-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Listing Completion</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 ${car.car_images?.length > 0 ? 'bg-green-500' : 'bg-gray-300'
                                            }`}>
                                            {car.car_images?.length > 0 && <span className="text-white text-sm">✓</span>}
                                        </div>
                                        <span className="text-gray-700">
                                            Upload at least one image ({car.car_images?.length || 0} uploaded)
                                        </span>
                                    </div>

                                    <div className="flex items-center">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 ${car.car_images?.some(img => img.is_primary) ? 'bg-green-500' : 'bg-gray-300'
                                            }`}>
                                            {car.car_images?.some(img => img.is_primary) && <span className="text-white text-sm">✓</span>}
                                        </div>
                                        <span className="text-gray-700">Set a primary image</span>
                                    </div>

                                    <div className="flex items-center">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 ${car.car_specs?.length >= 5 ? 'bg-green-500' : 'bg-gray-300'
                                            }`}>
                                            {car.car_specs?.length >= 5 && <span className="text-white text-sm">✓</span>}
                                        </div>
                                        <span className="text-gray-700">
                                            Add at least 5 specifications ({car.car_specs?.length || 0} added)
                                        </span>
                                    </div>

                                    <div className="flex items-center">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 ${car.car_images?.filter(img => img.image_type === '360').length >= 8 ? 'bg-green-500' : 'bg-yellow-500'
                                            }`}>
                                            {car.car_images?.filter(img => img.image_type === '360').length >= 8 ? (
                                                <span className="text-white text-sm">✓</span>
                                            ) : (
                                                <span className="text-white text-sm">!</span>
                                            )}
                                        </div>
                                        <span className="text-gray-700">
                                            Upload 8-36 images for 360° view (optional, {car.car_images?.filter(img => img.image_type === '360').length || 0} uploaded)
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default CarManagement;
