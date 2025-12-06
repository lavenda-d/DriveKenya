// src/components/CarCard.jsx
import React from 'react';

const CarCard = ({ car, onClick }) => {
  return (
    <div 
      className="bg-white rounded-xl shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      <div className="h-48 bg-gray-100 relative">
        {car.images?.[0]?.url ? (
          <img
            src={car.images[0].url}
            alt={`${car.make} ${car.model}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <span className="text-4xl">🚗</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg">
          {car.year} {car.make} {car.model}
        </h3>
        <p className="text-gray-600">KES {car.price_per_day?.toLocaleString()}/day</p>
        <div className="flex items-center mt-2">
          <span className="text-yellow-400">★</span>
          <span className="ml-1 text-sm text-gray-600">
            {car.rating ? car.rating.toFixed(1) : 'New'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CarCard;