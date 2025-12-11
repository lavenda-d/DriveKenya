import React, { useState, useEffect } from 'react';
import { 
  Car, 
  DollarSign, 
  Calendar, 
  TrendingUp, 
  Settings,
  Plus,
  Eye,
  Edit,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  MapPin,
  Users
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import AvailabilityCalendar from './AvailabilityCalendar';
import DataExport from './DataExport';
import useRealtimeUpdates from '../hooks/useRealtimeUpdates';

const OwnerDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState(null);
  const [cars, setCars] = useState([]);
  const [earnings, setEarnings] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('month');
  const [selectedCarId, setSelectedCarId] = useState(null);

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboardData();
  }, [selectedTimeframe]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/owner/dashboard?timeframe=${selectedTimeframe}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setDashboardData(data.dashboard);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCars = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/owner/cars', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setCars(data.cars);
      }
    } catch (error) {
      console.error('Failed to fetch cars:', error);
    }
  };

  const fetchEarnings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/owner/earnings?timeframe=${selectedTimeframe}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      if (data.success) {
        // Add sample chart data if not present
        const earningsWithCharts = {
          ...data.earnings,
          chartData: data.earnings.chartData || [
            { period: 'Jan', gross: 2500, fees: 375, net: 2125 },
            { period: 'Feb', gross: 3200, fees: 480, net: 2720 },
            { period: 'Mar', gross: 2800, fees: 420, net: 2380 },
            { period: 'Apr', gross: 3500, fees: 525, net: 2975 },
            { period: 'May', gross: 4100, fees: 615, net: 3485 },
            { period: 'Jun', gross: 3800, fees: 570, net: 3230 }
          ],
          fleetPerformanceData: data.earnings.fleetPerformanceData || [
            { carName: 'Toyota Camry', revenue: 2800, bookings: 12, utilization: 85 },
            { carName: 'Honda Civic', revenue: 2200, bookings: 10, utilization: 72 },
            { carName: 'BMW 320i', revenue: 3500, bookings: 8, utilization: 90 },
            { carName: 'Nissan Altima', revenue: 1900, bookings: 9, utilization: 65 }
          ]
        };
        setEarnings(earningsWithCharts);
      }
    } catch (error) {
      console.error('Failed to fetch earnings:', error);
    }
  };

  const fetchMaintenance = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/owner/maintenance', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setMaintenance(data.maintenance);
      }
    } catch (error) {
      console.error('Failed to fetch maintenance:', error);
    }
  };

  const toggleCarAvailability = async (carId, available) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/owner/cars/${carId}/availability`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ available })
      });
      
      const data = await response.json();
      if (data.success) {
        alert('Car availability updated successfully!');
        fetchCars();
      }
    } catch (error) {
      console.error('Failed to update car availability:', error);
    }
  };

  const scheduleMaintenance = async (carId, maintenanceData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/owner/cars/${carId}/maintenance`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(maintenanceData)
      });
      
      const data = await response.json();
      if (data.success) {
        alert('Maintenance scheduled successfully!');
        fetchMaintenance();
      }
    } catch (error) {
      console.error('Failed to schedule maintenance:', error);
    }
  };

  // Load data when tab changes
  useEffect(() => {
    switch (activeTab) {
      case 'cars':
        fetchCars();
        break;
      case 'earnings':
        fetchEarnings();
        break;
      case 'maintenance':
        fetchMaintenance();
        break;
    }
  }, [activeTab]);

  const StatCard = ({ title, value, icon: Icon, color, change, subtitle }) => (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-600">{subtitle}</p>
          )}
          {change && (
            <p className={`text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? '+' : ''}{change}% vs last period
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </div>
  );

  const TabButton = ({ id, label, icon: Icon, active, onClick }) => (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
        active
          ? 'bg-blue-600 text-white'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading owner dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Car Owner Dashboard</h1>
              <p className="text-gray-600">Manage your fleet and track earnings</p>
            </div>
            <div className="flex space-x-3">
              <select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700">
                <Plus size={20} />
                <span>Add Car</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="flex space-x-4 mb-8 overflow-x-auto">
          <TabButton
            id="overview"
            label="Overview"
            icon={TrendingUp}
            active={activeTab === 'overview'}
            onClick={setActiveTab}
          />
          <TabButton
            id="cars"
            label="My Cars"
            icon={Car}
            active={activeTab === 'cars'}
            onClick={setActiveTab}
          />
          <TabButton
            id="earnings"
            label="Earnings"
            icon={DollarSign}
            active={activeTab === 'earnings'}
            onClick={setActiveTab}
          />
          <TabButton
            id="maintenance"
            label="Maintenance"
            icon={Wrench}
            active={activeTab === 'maintenance'}
            onClick={setActiveTab}
          />
          <TabButton
            id="calendar"
            label="Calendar"
            icon={Calendar}
            active={activeTab === 'calendar'}
            onClick={setActiveTab}
          />
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && dashboardData && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Earnings"
                value={`$${dashboardData.totalEarnings}`}
                icon={DollarSign}
                color="bg-green-600"
                change={dashboardData.earningsGrowth}
              />
              <StatCard
                title="Active Cars"
                value={dashboardData.activeCars}
                icon={Car}
                color="bg-blue-500"
                subtitle={`${dashboardData.totalCars} total cars`}
              />
              <StatCard
                title="Total Bookings"
                value={dashboardData.totalBookings}
                icon={Calendar}
                color="bg-purple-500"
                change={dashboardData.bookingGrowth}
              />
              <StatCard
                title="Utilization Rate"
                value={`${dashboardData.utilizationRate}%`}
                icon={BarChart3}
                color="bg-orange-500"
                change={dashboardData.utilizationChange}
              />
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Fleet Performance */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Fleet Performance</h3>
                <div className="space-y-4">
                  {dashboardData.topPerformingCars.map((car, index) => (
                    <div key={car.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">
                          {car.make} {car.model}
                        </p>
                        <p className="text-sm text-gray-500">
                          {car.bookingCount} bookings
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">
                          ${car.earnings}
                        </p>
                        <p className="text-sm text-gray-500">
                          {car.utilizationRate}% utilized
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                <div className="space-y-4">
                  {dashboardData.recentBookings.map((booking, index) => (
                    <div key={booking.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className={`p-2 rounded-full ${
                        booking.status === 'confirmed' ? 'bg-green-100' :
                        booking.status === 'pending' ? 'bg-yellow-100' : 'bg-gray-100'
                      }`}>
                        <Calendar size={16} className={
                          booking.status === 'confirmed' ? 'text-green-600' :
                          booking.status === 'pending' ? 'text-yellow-600' : 'text-gray-600'
                        } />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {booking.carDetails}
                        </p>
                        <p className="text-xs text-gray-500">
                          {booking.customerName} • {booking.dateRange}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          ${booking.amount}
                        </p>
                        <p className={`text-xs ${
                          booking.status === 'confirmed' ? 'text-green-600' :
                          booking.status === 'pending' ? 'text-yellow-600' : 'text-gray-600'
                        }`}>
                          {booking.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Upcoming Maintenance */}
            {dashboardData.upcomingMaintenance.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
                <div className="flex items-center space-x-2 mb-4">
                  <AlertTriangle className="text-yellow-600" size={24} />
                  <h3 className="text-lg font-semibold text-yellow-800">
                    Upcoming Maintenance
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dashboardData.upcomingMaintenance.map((item, index) => (
                    <div key={item.id} className="bg-white p-4 rounded-lg">
                      <p className="font-medium text-gray-900">
                        {item.carDetails}
                      </p>
                      <p className="text-sm text-gray-600">
                        {item.type} - {item.scheduledDate}
                      </p>
                      <p className="text-sm text-yellow-600 font-medium">
                        Due in {item.daysUntil} days
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Cars Tab */}
        {activeTab === 'cars' && (
          <div className="space-y-6">
            {/* Cars Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cars.map((car) => (
                <div key={car.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="h-48 bg-gray-200 flex items-center justify-center">
                    <Car size={48} className="text-gray-400" />
                  </div>
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {car.make} {car.model}
                        </h3>
                        <p className="text-gray-600 text-sm">{car.year}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        car.status === 'active' && car.available
                          ? 'bg-green-100 text-green-800'
                          : car.status === 'maintenance'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {car.status === 'active' && car.available ? 'Available' :
                         car.status === 'maintenance' ? 'Maintenance' : 'Unavailable'}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Daily Rate</span>
                        <span className="font-semibold text-blue-600">
                          ${car.price_per_day}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Location</span>
                        <span className="text-sm text-gray-900">
                          {car.location}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">This Month</span>
                        <span className="text-sm font-medium text-green-600">
                          ${car.monthlyEarnings || 0}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Utilization</span>
                        <span className="text-sm text-gray-900">
                          {car.utilizationRate || 0}%
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 space-y-2">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => toggleCarAvailability(car.id, !car.available)}
                          className={`flex-1 px-4 py-2 rounded text-sm font-medium ${
                            car.available
                              ? 'bg-red-600 text-white hover:bg-red-700'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          {car.available ? 'Set Unavailable' : 'Set Available'}
                        </button>
                        <button className="flex-1 bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
                          Edit Details
                        </button>
                      </div>
                      
                      <button 
                        onClick={() => {
                          // Open maintenance scheduling modal
                          const type = prompt('Maintenance type (oil_change, tire_rotation, brake_service, general_inspection, repair, other):');
                          const scheduledDate = prompt('Scheduled date (YYYY-MM-DD):');
                          const description = prompt('Description:');
                          
                          if (type && scheduledDate) {
                            scheduleMaintenance(car.id, {
                              type,
                              scheduled_date: scheduledDate,
                              description: description || ''
                            });
                          }
                        }}
                        className="w-full bg-yellow-600 text-white px-4 py-2 rounded text-sm hover:bg-yellow-700"
                      >
                        Schedule Maintenance
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Earnings Tab */}
        {activeTab === 'earnings' && (
          <div className="space-y-6">
            {/* Earnings Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard
                title="Gross Earnings"
                value={`$${earnings.gross || 0}`}
                icon={DollarSign}
                color="bg-green-600"
              />
              <StatCard
                title="Platform Fees"
                value={`$${earnings.platformFees || 0}`}
                icon={DollarSign}
                color="bg-red-500"
              />
              <StatCard
                title="Net Earnings"
                value={`$${earnings.net || 0}`}
                icon={DollarSign}
                color="bg-blue-600"
              />
              <StatCard
                title="Commission Rate"
                value={`${earnings.commissionRate || 15}%`}
                icon={BarChart3}
                color="bg-purple-500"
              />
            </div>

            {/* Earnings Chart */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Earnings Timeline
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={earnings.chartData || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [
                        `$${value}`, 
                        name === 'gross' ? 'Gross Earnings' : 
                        name === 'net' ? 'Net Earnings' : 'Platform Fees'
                      ]} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="gross" 
                      stackId="1"
                      stroke="#10b981" 
                      fill="#10b981" 
                      fillOpacity={0.6} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="fees" 
                      stackId="2"
                      stroke="#ef4444" 
                      fill="#ef4444" 
                      fillOpacity={0.6} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="net" 
                      stroke="#3b82f6" 
                      strokeWidth={3} 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Fleet Performance Chart */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Fleet Performance
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={earnings.fleetPerformanceData || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="carName" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Bar yAxisId="left" dataKey="revenue" fill="#3b82f6" name="Revenue" />
                    <Bar yAxisId="right" dataKey="bookings" fill="#10b981" name="Bookings" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Earnings Breakdown */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Earnings by Car
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Car</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Bookings</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Gross</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fees</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {earnings.byCarData?.map((car, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {car.carDetails}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {car.bookings}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          ${car.gross}
                        </td>
                        <td className="px-4 py-3 text-sm text-red-600">
                          ${car.fees}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-green-600">
                          ${car.net}
                        </td>
                      </tr>
                    )) || (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                          No earnings data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Maintenance Tab */}
        {activeTab === 'maintenance' && (
          <div className="space-y-6">
            {/* Maintenance Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
                <div className="flex items-center space-x-2">
                  <Clock className="text-yellow-600" size={24} />
                  <h3 className="font-semibold text-yellow-800">Scheduled</h3>
                </div>
                <p className="text-2xl font-bold text-yellow-600 mt-2">
                  {maintenance.filter(m => m.status === 'scheduled').length}
                </p>
              </div>
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-2">
                  <Wrench className="text-blue-600" size={24} />
                  <h3 className="font-semibold text-blue-800">In Progress</h3>
                </div>
                <p className="text-2xl font-bold text-blue-600 mt-2">
                  {maintenance.filter(m => m.status === 'in_progress').length}
                </p>
              </div>
              <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="text-green-600" size={24} />
                  <h3 className="font-semibold text-green-800">Completed</h3>
                </div>
                <p className="text-2xl font-bold text-green-600 mt-2">
                  {maintenance.filter(m => m.status === 'completed').length}
                </p>
              </div>
            </div>

            {/* Maintenance List */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Maintenance Schedule</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Car</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scheduled</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {maintenance.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.carDetails}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.type.replace('_', ' ').toUpperCase()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(item.scheduled_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            item.status === 'completed' ? 'bg-green-100 text-green-800' :
                            item.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            item.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {item.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.cost ? `$${item.cost}` : 'TBD'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button className="text-blue-600 hover:text-blue-900">
                              <Edit size={16} />
                            </button>
                            <button className="text-gray-600 hover:text-gray-900">
                              <Eye size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        
        {/* Calendar Tab */}
        {activeTab === 'calendar' && (
          <div className="space-y-6">
            {cars.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Car for Calendar Management
                </label>
                <select 
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => setSelectedCarId(e.target.value)}
                  value={selectedCarId || ''}
                >
                  <option value="">Choose a car...</option>
                  {cars.map(car => (
                    <option key={car.id} value={car.id}>
                      {car.make} {car.model} ({car.license_plate})
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {selectedCarId && (
              <AvailabilityCalendar 
                carId={selectedCarId}
                onAvailabilityChange={() => {
                  // Refresh dashboard data when availability changes
                  fetchDashboardData();
                }}
              />
            )}
            
            {!selectedCarId && cars.length === 0 && (
              <div className="text-center py-8">
                <Car size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No cars found. Add a car to manage availability.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerDashboard;