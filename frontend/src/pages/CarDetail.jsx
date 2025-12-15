import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { carsAPI } from '../services/api';
import { FaArrowLeft, FaCar, FaGasPump, FaCog, FaStar, FaMapMarkerAlt, FaPhone, FaEnvelope } from 'react-icons/fa';
import { MdAirlineSeatReclineNormal, MdDirectionsCar } from 'react-icons/md';
import { BsCalendarDate, BsSpeedometer2 } from 'react-icons/bs';
import { GiGearStickPattern } from 'react-icons/gi';
import { useToast } from '../components/UIUtils';
import ImageGallery from '../components/ImageGallery';
import CarSpecs from '../components/CarSpecs';

const CarDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();
  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchCarDetails = async () => {
      try {
        setLoading(true);
        const response = await carsAPI.getCarById(id);
        if (response.success) {
          setCar(response.data);
        } else {
          showToast('Failed to load car details', 'error');
          navigate('/');
        }
      } catch (error) {
        console.error('Error fetching car details:', error);
        showToast('Error loading car details', 'error');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchCarDetails();
  }, [id, navigate]);

  const handleBookNow = () => {
    // Navigate to booking page or open booking modal
    navigate(`/book/${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!car) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Car Not Found</h2>
          <p className="text-gray-600">The requested car could not be found.</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Listings
          </button>
        </div>
      </div>
    );
  }

  // Note: Image handling is now done by ImageGallery component

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with back button */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="mr-4 p-2 rounded-full hover:bg-gray-100"
          >
            <FaArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900">
            {car.year} {car.make} {car.model}
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Image Gallery */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Main Image Gallery */}
          <div className="lg:col-span-2">
            <ImageGallery carId={id} />

            {/* Booking Card */}
            <div className="bg-white rounded-xl shadow-sm p-6 h-fit sticky top-4">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  KES {car.price_per_day?.toLocaleString()}
                  <span className="text-base font-normal text-gray-500"> / day</span>
                </h2>
                <div className="flex items-center text-yellow-400 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <FaStar
                      key={star}
                      className={`h-5 w-5 ${star <= (car.rating || 0) ? 'text-yellow-400' : 'text-gray-300'}`}
                    />
                  ))}
                  <span className="ml-2 text-sm text-gray-600">
                    {car.rating?.toFixed(1) || 'No reviews'}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <button
                  onClick={handleBookNow}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  Book Now
                </button>
                <button className="w-full border-2 border-blue-600 text-blue-600 font-medium py-3 px-4 rounded-lg hover:bg-blue-50 transition-colors">
                  Contact Owner
                </button>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="font-medium text-gray-900 mb-3">Car Features</h3>
                <div className="grid grid-cols-2 gap-3">
                  {car.transmission && (
                    <div className="flex items-center text-sm">
                      <GiGearStickPattern className="h-5 w-5 text-gray-500 mr-2" />
                      <span className="text-gray-700">{car.transmission}</span>
                    </div>
                  )}
                  {car.fuel_type && (
                    <div className="flex items-center text-sm">
                      <FaGasPump className="h-5 w-5 text-gray-500 mr-2" />
                      <span className="text-gray-700">{car.fuel_type}</span>
                    </div>
                  )}
                  {car.seats && (
                    <div className="flex items-center text-sm">
                      <MdAirlineSeatReclineNormal className="h-5 w-5 text-gray-500 mr-2" />
                      <span className="text-gray-700">{car.seats} Seats</span>
                    </div>
                  )}
                  {car.mileage && (
                    <div className="flex items-center text-sm">
                      <BsSpeedometer2 className="h-5 w-5 text-gray-500 mr-2" />
                      <span className="text-gray-700">{car.mileage.toLocaleString()} km</span>
                    </div>
                  )}
                  {car.year && (
                    <div className="flex items-center text-sm">
                      <BsCalendarDate className="h-5 w-5 text-gray-500 mr-2" />
                      <span className="text-gray-700">{car.year}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-8 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {['overview', 'specifications', 'reviews', 'location'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`${activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            {activeTab === 'overview' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">About This Car</h2>
                <p className="text-gray-600 mb-6">
                  {car.description || 'No description available for this vehicle.'}
                </p>

                <h3 className="text-lg font-medium mb-3">Features</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {car.features?.map((feature, index) => (
                    <div key={index} className="flex items-center">
                      <div className="flex-shrink-0 h-5 w-5 text-green-500">
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="ml-2 text-gray-700">{feature}</span>
                    </div>
                  )) || (
                      <p className="text-gray-500">No features listed</p>
                    )}
                </div>
              </div>
            )}

            {activeTab === 'specifications' && (
              <div>
                <CarSpecs carId={id} />
              </div>
            )}

            {activeTab === 'reviews' && (
              <div>
                <h2 className="text-xl font-semibold mb-6">Customer Reviews</h2>
                {car.reviews?.length > 0 ? (
                  <div className="space-y-6">
                    {car.reviews.map((review) => (
                      <div key={review.id} className="border-b border-gray-200 pb-6 last:border-0 last:pb-0">
                        <div className="flex items-center mb-2">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                            {review.user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-3">
                            <h4 className="font-medium">{review.user.name}</h4>
                            <div className="flex items-center">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <FaStar
                                  key={star}
                                  className={`h-4 w-4 ${star <= review.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                                />
                              ))}
                              <span className="ml-2 text-sm text-gray-500">
                                {new Date(review.date).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <p className="mt-2 text-gray-700">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No reviews yet. Be the first to review!</p>
                    <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                      Write a Review
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'location' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Location</h2>
                <div className="h-80 bg-gray-200 rounded-lg overflow-hidden mb-4">
                  {/* Map would be implemented here */}
                  <div className="h-full flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <FaMapMarkerAlt className="h-12 w-12 mx-auto mb-2" />
                      <p>Map view of {car.location}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-3">
                    <FaMapMarkerAlt className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Pickup Location</p>
                    <p className="text-gray-600">{car.location || 'Nairobi, Kenya'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Owner Info */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">About the Owner</h2>
            <div className="flex items-start">
              <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-500">
                {car.owner?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="ml-4">
                <h3 className="font-medium text-gray-900">{car.owner?.name || 'Car Owner'}</h3>
                <p className="text-gray-500 text-sm">Member since {new Date(car.owner?.join_date || Date.now()).getFullYear()}</p>
                <div className="flex mt-2 space-x-4">
                  <a href={`tel:${car.owner?.phone || ''}`} className="flex items-center text-blue-600 hover:text-blue-800">
                    <FaPhone className="h-4 w-4 mr-1" /> Call
                  </a>
                  <a href={`mailto:${car.owner?.email || ''}`} className="flex items-center text-blue-600 hover:text-blue-800">
                    <FaEnvelope className="h-4 w-4 mr-1" /> Message
                  </a>
                </div>
              </div>
            </div>
          </div>
      </main>
      <ToastContainer />
    </div>
  );
};

export default CarDetail;
