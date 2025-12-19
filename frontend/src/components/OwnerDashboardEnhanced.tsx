import React, { useState, useEffect } from 'react';
import { Car } from '../types/car';
import { User } from '../types/dashboard';
import { FaCar, FaEdit, FaTrash, FaPlus, FaBell, FaEnvelope, FaChartLine, FaMoneyBillWave, FaStar, FaCalendarAlt, FaTools } from 'react-icons/fa';
import { ownerAPI } from '../services/ownerAPI';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// ... (interface definitions remain the same)
const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ user, onCarSelect }) => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [myCars, setMyCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalEarnings: 0,
    activeBookings: 0,
    totalCars: 0,
    rating: 4.8,
    monthlyEarnings: 0,
    utilizationRate: 0
  });
  // Fetch owner's cars and stats
  // Fetch owner's cars and stats (extracted so it can be retried)
  const fetchOwnerData = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      // Fetch owner's cars
      const carsResponse = await ownerAPI.getMyCars();
      if (carsResponse.success && carsResponse.data) {
        setMyCars(carsResponse.data);
      } else {
        const msg = carsResponse.error || 'Failed to load cars';
        setErrorMessage(msg);
        toast.error(msg);
      }

      // Fetch dashboard stats
      const statsResponse = await ownerAPI.getDashboardStats();
      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      } else {
        const msg = statsResponse.error || 'Failed to load dashboard stats';
        setErrorMessage(prev => prev ? prev + ' • ' + msg : msg);
        toast.error(msg);
      }
    } catch (error) {
      console.error('Error fetching owner data:', error);
      const msg = 'An error occurred while loading data';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOwnerData();
  }, []);
  const handleToggleAvailability = async (carId: string, currentStatus: boolean) => {
    try {
      const response = await ownerAPI.updateCarAvailability(carId, !currentStatus);
      if (response.success) {
        setMyCars(myCars.map(car => 
          car.id === carId ? { ...car, available: !currentStatus } : car
        ));
        toast.success('Car availability updated successfully');
      } else {
        toast.error(response.error || 'Failed to update car availability');
      }
    } catch (error) {
      console.error('Error toggling car availability:', error);
      toast.error('An error occurred while updating car availability');
    }
  };
  const handleDeleteCar = async (carId: string) => {
    if (window.confirm('Are you sure you want to delete this car listing?')) {
      try {
        const response = await ownerAPI.deleteCar(carId);
        if (response.success) {
          setMyCars(myCars.filter(car => car.id !== carId));
          toast.success('Car deleted successfully');
        } else {
          toast.error(response.error || 'Failed to delete car');
        }
      } catch (error) {
        console.error('Error deleting car:', error);
        toast.error('An error occurred while deleting the car');
      }
    }
  };

  const handleEditCar = (carId: string) => {
    // Placeholder for edit action — wire up to edit modal or route
    console.log('Edit car:', carId);
  };

  const toggleCarAvailability = (carId: string, available: boolean) => {
    setMyCars(myCars.map(car => 
      car.id === carId ? { ...car, available } : car
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-xl w-full bg-white border border-gray-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold mb-2">Unable to load dashboard</h3>
          <p className="text-gray-600 mb-4">{errorMessage}</p>
          <div className="flex justify-center space-x-3">
            <button
              onClick={() => fetchOwnerData()}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Retry
            </button>
            <button
              onClick={() => setErrorMessage(null)}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-6">
          <div className="h-1 w-24 bg-gradient-to-r from-blue-500 to-indigo-600 rounded mb-4 shadow-sm" />
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Owner Dashboard</h1>
          <p className="mt-1 text-gray-600">
            Welcome back, <span className="font-medium text-gray-800">{user?.name || 'Owner'}</span> — here's an overview of your listings and performance.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Earnings */}
          <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all border border-gray-200">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg mr-4">
                <FaMoneyBillWave className="text-blue-600 text-xl" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Earnings</p>
                <p className="text-2xl font-bold text-gray-900">
                  KES {stats.totalEarnings.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Active Bookings */}
          <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all border border-gray-200">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg mr-4">
                <FaCalendarAlt className="text-green-600 text-xl" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Active Bookings</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeBookings}</p>
              </div>
            </div>
          </div>

          {/* Listed Cars */}
          <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all border border-gray-200">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg mr-4">
                <FaCar className="text-purple-600 text-xl" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Listed Cars</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCars}</p>
              </div>
            </div>
          </div>

          {/* Utilization Rate */}
          <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all border border-gray-200">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg mr-4">
                <FaChartLine className="text-yellow-600 text-xl" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Utilization Rate</p>
                <p className="text-2xl font-bold text-gray-900">{stats.utilizationRate.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Summary Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Earnings Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded">
                <p className="text-sm text-gray-500">Total Earnings</p>
                <p className="text-2xl font-bold text-gray-900">KES {(stats.totalEarnings || 0).toLocaleString()}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded">
                <p className="text-sm text-gray-500">This Month</p>
                <p className="text-2xl font-bold text-gray-900">KES {(stats.monthlyEarnings || 0).toLocaleString()}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded">
                <p className="text-sm text-gray-500">Bookings</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalBookings || 0}</p>
                <p className="text-xs text-gray-400">{`(${stats.monthlyBookings || 0} this month)`}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Average Rating</h3>
            <div className="flex items-center">
              <div className="text-3xl font-bold text-gray-900 mr-4">{(stats.rating || (() => {
                const avg = myCars.reduce((s, c) => s + (c.rating || 0), 0) / Math.max(1, myCars.length);
                return Number.isFinite(avg) ? avg.toFixed(1) : 'N/A';
              })())}</div>
              <div className="text-sm text-gray-500">Based on your listed cars</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: <FaChartLine className="mr-2" /> },
              { id: 'cars', label: 'My Cars', icon: <FaCar className="mr-2" /> },
              { id: 'bookings', label: 'Bookings', icon: <FaCalendarAlt className="mr-2" /> },
              { id: 'maintenance', label: 'Maintenance', icon: <FaTools className="mr-2" /> },
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
              <div className="space-y-4">
                {myCars.length > 0 ? (
                  myCars.map(car => (
                    <div key={car.id} className="flex items-center p-4 border border-gray-100 rounded-lg hover:bg-gray-50">
                      <div className="flex-shrink-0 h-16 w-16 bg-gray-200 rounded-md overflow-hidden">
                        {car.images?.[0]?.url ? (
                          <img src={car.images[0].url} alt={car.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full bg-gray-300 flex items-center justify-center">
                            <FaCar className="text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-medium">{car.name}</h3>
                        <p className="text-sm text-gray-500">
                          {car.make} {car.model} • {car.year}
                        </p>
                        <div className="flex items-center mt-1">
                          <span className="text-yellow-500">
                            <FaStar />
                          </span>
                          <span className="ml-1 text-sm text-gray-700">
                            {car.rating?.toFixed(1) || 'N/A'}
                          </span>
                          <span className="mx-2 text-gray-300">•</span>
                          <span className="text-sm text-gray-700">
                            KES {car.price_per_day?.toLocaleString()}/day
                          </span>
                        </div>
                      </div>
                      <div className="ml-auto">
                        <span className={`px-2 py-1 text-xs rounded-full ${car.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {car.available ? 'Available' : 'Unavailable'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <FaCar className="mx-auto text-gray-300 text-4xl mb-2" />
                    <p className="text-gray-500">No cars listed yet. Add your first car to get started!</p>
                    <button
                      onClick={() => setActiveTab('cars')}
                      className="mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg flex items-center shadow hover:opacity-95 transition"
                    >
                      <FaPlus className="inline mr-2" />
                      Add Car
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'cars' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">My Cars</h2>
                <button
                  onClick={() => console.log('Add new car')}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg flex items-center shadow hover:opacity-95 transition"
                >
                  <FaPlus className="mr-2" />
                  Add New Car
                </button>
              </div>
              
              {myCars.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myCars.map((car) => (
                    <div key={car.id} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <div className="h-48 bg-gray-100 relative">
                        {car.images?.[0]?.url ? (
                          <img
                            src={car.images[0].url}
                            alt={car.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <FaCar className="text-4xl" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${car.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {car.available ? 'Available' : 'Unavailable'}
                          </span>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-lg">{car.name}</h3>
                            <p className="text-gray-600">{car.make} {car.model} • {car.year}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">KES {car.price_per_day?.toLocaleString()}<span className="text-sm font-normal text-gray-500">/day</span></p>
                            <div className="flex items-center justify-end">
                              <FaStar className="text-yellow-400 mr-1" />
                              <span>{car.rating?.toFixed(1) || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between">
                          <button
                            onClick={() => handleEditCar(car.id)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <FaEdit className="inline mr-1" /> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteCar(car.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <FaTrash className="inline mr-1" /> Delete
                          </button>
                          <button
                            onClick={() => toggleCarAvailability(car.id, !car.available)}
                            className={`px-2 py-1 text-xs rounded ${car.available ? 'bg-red-100 text-red-800 hover:bg-red-200' : 'bg-green-100 text-green-800 hover:bg-green-200'}`}
                          >
                            {car.available ? 'Mark Unavailable' : 'Mark Available'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FaCar className="mx-auto text-gray-300 text-5xl mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No cars listed yet</h3>
                  <p className="text-gray-500 mb-6">Add your first car to start earning with DriveKenya</p>
                  <button
                    onClick={() => console.log('Add new car')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg inline-flex items-center"
                  >
                    <FaPlus className="mr-2" />
                    Add Your First Car
                  </button>
                </div>
              )}
              {/* Top performing cars + recent bookings */}
              <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
                  <h3 className="text-lg font-medium mb-4">Top Performing Cars</h3>
                  {Array.isArray(stats.topPerformingCars) && stats.topPerformingCars.length > 0 ? (
                    <ul className="space-y-3">
                      {stats.topPerformingCars.map((car: any) => (
                        <li key={car.id} className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{car.car_name || car.make + ' ' + car.model}</div>
                            <div className="text-sm text-gray-500">Earnings: <span className="text-gray-900 font-semibold">KES {(car.earnings || car.revenue || 0).toLocaleString()}</span></div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-600">Bookings: <span className="text-gray-900 font-medium">{car.bookingCount || car.bookings || 0}</span></div>
                            <div className="text-sm text-gray-600">Utilization: <span className="text-gray-900 font-medium">{Math.round(car.utilizationRate || car.utilization_rate || 0)}%</span></div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">No performance data available yet.</p>
                  )}
                </div>

                <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
                  <h3 className="text-lg font-medium mb-4">Recent Bookings</h3>
                  {Array.isArray(stats.recentBookings) && stats.recentBookings.length > 0 ? (
                    <ul className="space-y-3">
                      {stats.recentBookings.map((b: any) => (
                        <li key={b.id} className="flex items-start justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{b.carDetails || b.car_name || b.car_name}</div>
                            <div className="text-sm text-gray-500">{b.customerName || b.customer_name} • {b.dateRange || `${b.start_date} - ${b.end_date}`}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-gray-900">KES {(b.amount || b.total_price || 0).toLocaleString()}</div>
                            <div className="text-xs text-gray-400">{b.status || b.status}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">No recent bookings to show.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'bookings' && (
            <div>
              <h2 className="text-xl font-semibold mb-6">Bookings</h2>
              <div className="bg-gray-50 p-6 rounded-lg text-center">
                <FaCalendarAlt className="mx-auto text-gray-400 text-4xl mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings yet</h3>
                <p className="text-gray-500 mb-6">When you receive bookings, they'll appear here</p>
              </div>
            </div>
          )}

          {activeTab === 'maintenance' && (
            <div>
              <h2 className="text-xl font-semibold mb-6">Maintenance</h2>
              <div className="bg-gray-50 p-6 rounded-lg text-center">
                <FaTools className="mx-auto text-gray-400 text-4xl mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No maintenance scheduled</h3>
                <p className="text-gray-500 mb-6">Schedule maintenance for your vehicles to keep them in top condition</p>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">
                  Schedule Maintenance
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboard;
