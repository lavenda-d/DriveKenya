import React from 'react';

// Define the Car interface here since it's not exported from App
export interface Car {
  id: string;
  name: string;
  make: string;
  model: string;
  year: number;
  category?: string;
  price_per_day: number;
  location?: string;
  rating?: number;
  seats?: number | string;
  description?: string;
  specs?: {
    transmission?: string;
    fuelType?: string;
  };
  features?: string[];
  images?: Array<{ url: string }>;
  owner?: {
    name?: string;
    rating?: number;
    reviewCount?: number;
  };
  reviews?: Array<{
    userName?: string;
    rating: number;
    comment: string;
    date?: Date | string;
  }>;
  [key: string]: any;
}

interface CarDetailViewProps {
  car: Car;
  onBack: () => void;
}

const CarDetailView: React.FC<CarDetailViewProps> = ({ car, onBack }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-slate-900 pt-20">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <button
          onClick={onBack}
          className="flex items-center text-white/80 hover:text-white mb-8 transition-colors"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to results
        </button>

        <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
          {/* Main Image */}
          <div className="relative h-96 bg-gray-800">
            {car.images?.[0]?.url ? (
              <img
                src={car.images[0].url}
                alt={`${car.make} ${car.model}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <span className="text-8xl">🚗</span>
              </div>
            )}
            <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-full flex items-center">
              <span className="text-yellow-400">⭐</span>
              <span className="ml-1">{car.rating?.toFixed(1) || '4.8'}</span>
            </div>
          </div>

          <div className="p-8">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Left Column - Car Info */}
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white mb-2">
                  {car.year} {car.make} {car.model}
                </h1>
                <p className="text-white/70 text-lg mb-6">
                  {car.location || 'Nairobi, Kenya'}
                </p>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-white/5 p-4 rounded-lg">
                    <div className="text-white/60 text-sm">Price per day</div>
                    <div className="text-2xl font-bold text-white">
                      KES {car.price_per_day?.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-white/5 p-4 rounded-lg">
                    <div className="text-white/60 text-sm">Transmission</div>
                    <div className="text-lg font-medium text-white">
                      {car.specs?.transmission || 'Automatic'}
                    </div>
                  </div>
                  <div className="bg-white/5 p-4 rounded-lg">
                    <div className="text-white/60 text-sm">Fuel Type</div>
                    <div className="text-lg font-medium text-white">
                      {car.specs?.fuelType || 'Petrol'}
                    </div>
                  </div>
                  <div className="bg-white/5 p-4 rounded-lg">
                    <div className="text-white/60 text-sm">Seats</div>
                    <div className="text-lg font-medium text-white">
                      {car.seats || '5'}
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-white mb-4">About this car</h3>
                  <p className="text-white/80">
                    {car.description || `This ${car.make} ${car.model} is a great choice for your next trip. Comfortable, reliable, and perfect for exploring Kenya's beautiful landscapes.`}
                  </p>
                </div>

                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-white mb-4">Features</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {(() => {
                      const features = typeof car.features === 'string' ? JSON.parse(car.features || '[]') : (car.features || []);
                      return features.length > 0 ? features.map((feature: string, index: number) => (
                        <div key={index} className="flex items-center">
                          <span className="text-green-400 mr-2">✓</span>
                          <span className="text-white/80">{feature}</span>
                        </div>
                      )) : (
                      <>
                        <div className="flex items-center">
                          <span className="text-green-400 mr-2">✓</span>
                          <span className="text-white/80">Air Conditioning</span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-green-400 mr-2">✓</span>
                          <span className="text-white/80">Bluetooth</span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-green-400 mr-2">✓</span>
                          <span className="text-white/80">GPS Navigation</span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-green-400 mr-2">✓</span>
                          <span className="text-white/80">USB Ports</span>
                        </div>
                      </>
                    );
                    })()}
                  </div>
                </div>
              </div>

              {/* Right Column - Booking Form */}
              <div className="w-full md:w-96">
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                  <h3 className="text-xl font-semibold text-white mb-6">Book this car</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-white/70 text-sm mb-2">Pickup Date</label>
                      <input
                        type="date"
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-white/70 text-sm mb-2">Return Date</label>
                      <input
                        type="date"
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="pt-4 border-t border-white/10">
                      <div className="flex justify-between mb-2">
                        <span className="text-white/70">Price per day</span>
                        <span className="text-white">KES {car.price_per_day?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-white/70">Number of days</span>
                        <span className="text-white">3 days</span>
                      </div>
                      <div className="flex justify-between text-lg font-semibold mt-4 pt-4 border-t border-white/10">
                        <span>Total</span>
                        <span className="text-blue-400">
                          KES {(car.price_per_day * 3)?.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    
                    <button
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 rounded-lg font-semibold transition-all mt-6"
                      onClick={() => {
                        // Handle booking logic here
                      }}
                    >
                      Book Now
                    </button>
                  </div>
                </div>
                
                <div className="mt-6 bg-white/5 border border-white/10 rounded-xl p-6">
                  <h4 className="font-semibold text-white mb-4">Owner Information</h4>
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xl mr-4">
                      {car.owner?.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="text-white font-medium">{car.owner?.name || 'Car Owner'}</p>
                      <p className="text-white/60 text-sm">
                        {car.owner?.rating ? `⭐ ${car.owner.rating} (${car.owner.reviewCount || 0} reviews)` : 'New owner'}
                      </p>
                    </div>
                  </div>
                  <button className="w-full mt-4 bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg font-medium transition-colors">
                    Contact Owner
                  </button>
                </div>
              </div>
            </div>
            
            {/* Additional Images */}
            {car.images && car.images.length > 1 && (
              <div className="mt-12">
                <h3 className="text-xl font-semibold text-white mb-6">More Photos</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {car.images?.slice(1).map((image: { url: string }, index: number) => (
                    <div key={index} className="aspect-square bg-gray-800 rounded-lg overflow-hidden">
                      <img
                        src={image.url}
                        alt={`${car.make} ${car.model} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Reviews Section */}
            <div className="mt-12">
              <h3 className="text-xl font-semibold text-white mb-6">Reviews</h3>
              {car.reviews && car.reviews.length > 0 ? (
                <div className="space-y-6">
                  {car.reviews?.map((review: { userName?: string; rating: number; comment: string; date?: Date | string }, index: number) => (
                    <div key={index} className="bg-white/5 p-6 rounded-xl">
                      <div className="flex items-center mb-4">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-300 font-bold mr-3">
                          {review.userName?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="text-white font-medium">{review.userName || 'Anonymous'}</p>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <span key={i} className={i < (review.rating || 5) ? 'text-yellow-400' : 'text-gray-500'}>
                                ★
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <p className="text-white/80">{review.comment}</p>
                      <p className="text-white/50 text-sm mt-3">
                        {new Date(review.date || new Date()).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-white/60">No reviews yet. Be the first to review this car!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarDetailView;
