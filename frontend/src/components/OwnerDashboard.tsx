import React, { useState, useEffect } from 'react';
import { Car } from '../types/car';
import { FaCar, FaEdit, FaTrash, FaPlus, FaBell, FaEnvelope, FaChartLine, FaMoneyBillWave, FaStar } from 'react-icons/fa';

interface OwnerDashboardProps {
  user: {
    id: string;
    name: string;
    email: string;
    role?: string;
  };
  onCarSelect: (car: Car) => void;
}

const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ user, onCarSelect }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [myCars, setMyCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    activeBookings: 0,
    totalCars: 0,
    rating: 4.8,
  });

  useEffect(() => {
    // In a real app, fetch owner's cars and stats from the API
    const fetchOwnerData = async () => {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock data - replace with actual API call
        const mockCars: Car[] = [
          {
            id: '1',
            name: 'My Toyota RAV4',
            make: 'Toyota',
            model: 'RAV4',
            year: 2022,
            price_per_day: 6500,
            location: 'Nairobi',
            rating: 4.7,
            images: [{ url: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800' }],
            features: ['Automatic', '4WD', 'Bluetooth'],
          },
          // Add more mock cars as needed
        ];

        setMyCars(mockCars);
        setStats({
          totalEarnings: 156000,
          activeBookings: 3,
          totalCars: mockCars.length,
          rating: 4.8,
        });
      } catch (error) {
        console.error('Error fetching owner data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOwnerData();
  }, []);

  const handleEditCar = (carId: string) => {
    // Handle edit car
    console.log('Edit car:', carId);
  };

  const handleDeleteCar = (carId: string) => {
    // Handle delete car with confirmation
    if (window.confirm('Are you sure you want to delete this car listing?')) {
      console.log('Delete car:', carId);
      // Update state or make API call
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Owner Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user.name || 'Owner'}! Here's what's happening with your listings.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg mr-4">
                <FaMoneyBillWave className="text-blue-600 text-xl" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Earnings</p>
                <p className="text-2xl font-bold">KES {stats.totalEarnings.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg mr-4">
                <FaCar className="text-green-600 text-xl" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Active Bookings</p>
                <p className="text-2xl font-bold">{stats.activeBookings}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg mr-4">
                <FaCar className="text-purple-600 text-xl" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Listed Cars</p>
                <p className="text-2xl font-bold">{stats.totalCars}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg mr-4">
                <FaStar className="text-yellow-500 text-xl" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Average Rating</p>
                <div className="flex items-center">
                  <span className="text-2xl font-bold mr-2">{stats.rating}</span>
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <FaStar key={i} className={`${i < Math.floor(stats.rating) ? 'text-yellow-400' : 'text-gray-300'} text-sm`} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: <FaChartLine className="mr-2" /> },
              { id: 'cars', label: 'My Cars', icon: <FaCar className="mr-2" /> },
              { id: 'bookings', label: 'Bookings', icon: <FaBell className="mr-2" /> },
              { id: 'messages', label: 'Messages', icon: <FaEnvelope className="mr-2" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {activeTab === 'overview' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-600">Your recent activity will appear here.</p>
                {/* Add activity feed component */}
              </div>
            </div>
          )}

          {activeTab === 'cars' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">My Cars</h2>
                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
                  onClick={() => console.log('Add new car')}
                >
                  <FaPlus className="mr-2" />
                  Add New Car
                </button>
              </div>

              {myCars.length === 0 ? (
                <div className="text-center py-12">
                  <FaCar className="mx-auto text-4xl text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No cars listed yet</h3>
                  <p className="mt-1 text-gray-500">Get started by adding your first car to rent out.</p>
                  <button
                    className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
                    onClick={() => console.log('Add first car')}
                  >
                    Add Your First Car
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Car
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Price/Day
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rating
                        </th>
                        <th scope="col" className="relative px-6 py-3">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {myCars.map((car) => (
                        <tr key={car.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onCarSelect(car)}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-12 w-20 bg-gray-200 rounded-md overflow-hidden">
                                {car.images?.[0]?.url ? (
                                  <img className="h-full w-full object-cover" src={car.images[0].url} alt={car.name} />
                                ) : (
                                  <div className="h-full w-full bg-gray-300 flex items-center justify-center">
                                    <FaCar className="text-gray-400" />
                                  </div>
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {car.year} {car.make} {car.model}
                                </div>
                                <div className="text-sm text-gray-500">{car.location}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Available
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            KES {car.price_per_day?.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <FaStar
                                  key={i}
                                  className={`${i < Math.floor(car.rating || 0) ? 'text-yellow-400' : 'text-gray-300'} text-sm`}
                                />
                              ))}
                              <span className="ml-1 text-sm text-gray-500">
                                {car.rating?.toFixed(1) || 'N/A'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditCar(car.id);
                              }}
                              className="text-blue-600 hover:text-blue-900 mr-4"
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCar(car.id);
                              }}
                              className="text-red-600 hover:text-red-900"
                            >
                              <FaTrash />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'bookings' && (
            <div>
              <h2 className="text-xl font-semibold mb-6">Booking Requests</h2>
              <div className="bg-gray-50 p-8 text-center rounded-lg">
                <FaBell className="mx-auto text-4xl text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No booking requests yet</h3>
                <p className="mt-1 text-gray-500">When you receive booking requests, they'll appear here.</p>
              </div>
            </div>
          )}

          {activeTab === 'messages' && (
            <div>
              <h2 className="text-xl font-semibold mb-6">Messages</h2>
              <div className="bg-gray-50 p-8 text-center rounded-lg">
                <FaEnvelope className="mx-auto text-4xl text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No messages yet</h3>
                <p className="mt-1 text-gray-500">When you receive messages from renters, they'll appear here.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboard;
