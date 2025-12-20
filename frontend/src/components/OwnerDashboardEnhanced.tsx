import React, { useState, useEffect, useCallback } from 'react';
import {
  Car,
  DollarSign,
  Calendar,
  TrendingUp,
  Plus,
  Wrench,
  AlertTriangle,
  Clock,
  BarChart3,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useToast, AnimatedSection, StaggerContainer, StaggerItem, ScaleInteraction, CustomDropdown } from './UIUtils';
import { User } from '../types/dashboard';
import { genericAPI, authStorage } from '../services/api';

interface OwnerDashboardProps {
  user: User;
  onLogout: () => void;
  onNavigate?: (page: string) => void;
}

const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ user, onLogout, onNavigate }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [cars, setCars] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any>({});
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('month');
  const { showToast, ToastContainer } = useToast();

  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState({
    carId: '',
    type: 'Service',
    scheduledDate: new Date().toISOString().split('T')[0],
    cost: '',
    provider: '',
    description: ''
  });

  const getAuthHeader = () => {
    const token = authStorage.getToken();
    return { Authorization: `Bearer ${token}` };
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/owner/dashboard?timeframe=${selectedTimeframe}`, {
        headers: getAuthHeader()
      });
      if (response.success) {
        setDashboardData(response.dashboard);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedTimeframe]);

  const fetchCars = useCallback(async () => {
    try {
      const response = await api.get('/owner/cars', {
        headers: getAuthHeader()
      });
      if (response.success) {
        setCars(response.cars || []);
      }
    } catch (error) {
      console.error('Failed to fetch cars:', error);
    }
  }, []);

  const fetchEarnings = useCallback(async () => {
    try {
      const response = await api.get(`/owner/earnings?timeframe=${selectedTimeframe}`, {
        headers: getAuthHeader()
      });
      if (response.success) {
        const data = response.data;
        const earningsData = {
          gross: data.summary?.totalEarnings || 0,
          net: data.summary?.netEarnings || 0,
          platformFees: data.summary?.commission || 0,
          commissionRate: (data.summary?.platformCommissionRate || 0) * 100,
          chartData: data.timeline || [],
          fleetPerformanceData: data.byCar || []
        };
        setEarnings(earningsData);
      }
    } catch (error) {
      console.error('Failed to fetch earnings:', error);
    }
  }, [selectedTimeframe]);

  const fetchMaintenance = useCallback(async () => {
    try {
      const response = await api.get('/owner/maintenance', {
        headers: getAuthHeader()
      });
      if (response.success) {
        setMaintenance(response.maintenance);
      }
    } catch (error) {
      console.error('Failed to fetch maintenance:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Tab switch load
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
        if (cars.length === 0) fetchCars();
        break;
    }
  }, [activeTab, fetchCars, fetchEarnings, fetchMaintenance, cars.length]);

  const toggleCarAvailability = async (carId: number, available: boolean) => {
    try {
      const response = await api.put(`/owner/cars/${carId}/availability`, {
        body: JSON.stringify({ available }),
        headers: getAuthHeader()
      });
      if (response.success) {
        showToast(`Car marked as ${available ? 'available' : 'unavailable'}`, 'success');
        fetchCars();
      }
    } catch (error) {
      console.error('Failed to update availability:', error);
      showToast('Failed to update availability', 'error');
    }
  };

  const handleMaintenanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintenanceForm.carId) {
      showToast('Please select a vehicle', 'error');
      return;
    }

    await scheduleMaintenance(Number(maintenanceForm.carId), {
      type: maintenanceForm.type,
      scheduledDate: maintenanceForm.scheduledDate,
      cost: Number(maintenanceForm.cost),
      provider: maintenanceForm.provider,
      description: maintenanceForm.description,
      status: 'scheduled'
    });

    setShowMaintenanceModal(false);
    // Reset form
    setMaintenanceForm({
      carId: '',
      type: 'Service',
      scheduledDate: new Date().toISOString().split('T')[0],
      cost: '',
      provider: '',
      description: ''
    });
  };

  const scheduleMaintenance = async (carId: number, data: any) => {
    try {
      const response = await api.post(`/owner/cars/${carId}/maintenance`, {
        body: JSON.stringify(data),
        headers: getAuthHeader()
      });
      if (response.success) {
        showToast('Maintenance scheduled successfully', 'success');
        fetchMaintenance();
        if (activeTab === 'cars') fetchCars();
      }
    } catch (error) {
      console.error('Failed to schedule maintenance:', error);
      showToast('Failed to schedule maintenance', 'error');
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, change, subtitle }: any) => (
    <StaggerItem>
      <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/20 hover:bg-white/15 transition-all duration-300 group">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/60 text-sm font-medium uppercase tracking-wider">{title}</p>
            <p className="text-3xl font-bold text-white mt-2 group-hover:scale-105 transition-transform origin-left">{value}</p>
            {subtitle && (
              <p className="text-sm text-white/50 mt-1">{subtitle}</p>
            )}
            {change && (
              <p className={`text-sm mt-3 font-medium flex items-center ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% vs last period
              </p>
            )}
          </div>
          <div className={`p-4 rounded-xl ${color} bg-opacity-20 border border-white/10 group-hover:scale-110 transition-transform`}>
            <Icon size={28} className={color.replace('bg-', 'text-').replace('600', '400')} />
          </div>
        </div>
      </div>
    </StaggerItem>
  );

  const TabButton = ({ id, label, icon: Icon, active, onClick }: any) => (
    <ScaleInteraction>
      <button
        onClick={() => onClick(id)}
        className={`flex items-center space-x-2 px-6 py-3 rounded-full transition-all duration-300 font-medium ${active
          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-900/50 scale-105'
          : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
      >
        <Icon size={18} />
        <span>{label}</span>
      </button>
    </ScaleInteraction>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-slate-900 pt-24 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white/50 mx-auto"></div>
          <p className="mt-6 text-white/70 text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-slate-900 pt-24 pb-12 font-sans">
      <ToastContainer />

      {/* Header Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl relative z-30">
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                Owner Dashboard
              </h1>
              <p className="text-white/60 text-lg">
                Welcome back, <span className="text-blue-400 font-bold">{user.name || user.first_name || 'Partner'}</span> • Manage your fleet and earnings
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <CustomDropdown
                value={selectedTimeframe}
                onChange={setSelectedTimeframe}
                options={[
                  { label: 'This Week', value: 'week', icon: <Clock size={16} className="text-blue-400" /> },
                  { label: 'This Month', value: 'month', icon: <Clock size={16} className="text-purple-400" /> },
                  { label: 'This Quarter', value: 'quarter', icon: <Clock size={16} className="text-pink-400" /> },
                  { label: 'This Year', value: 'year', icon: <Clock size={16} className="text-green-400" /> },
                ]}
                className="w-48"
              />

              <div className="h-10 w-px bg-white/10 mx-2 hidden md:block"></div>

              <ScaleInteraction>
                <button
                  onClick={onLogout}
                  className="px-4 py-3 bg-white/5 hover:bg-red-500/20 text-white/70 hover:text-red-400 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
                >
                  Logout
                </button>
              </ScaleInteraction>

              <ScaleInteraction>
                <button
                  onClick={() => onNavigate && onNavigate('listcar')}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl flex items-center space-x-2 shadow-lg hover:shadow-xl transition-all font-medium"
                >
                  <Plus size={20} />
                  <span>Add Vehicle</span>
                </button>
              </ScaleInteraction>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-2 overflow-x-auto pt-8 pb-2 mt-2 hide-scrollbar">
            <TabButton
              id="overview"
              label="Overview"
              icon={TrendingUp}
              active={activeTab === 'overview'}
              onClick={setActiveTab}
            />
            <TabButton
              id="cars"
              label="My Fleet"
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
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && dashboardData && (
          <div className="space-y-8 fade-in">
            {/* Stats Cards */}
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Earnings"
                value={`$${(dashboardData?.totalEarnings || 0).toLocaleString()}`}
                icon={DollarSign}
                color="bg-green-600"
                change={dashboardData?.earningsGrowth}
              />
              <StatCard
                title="Active Cars"
                value={dashboardData?.activeCars || 0}
                icon={Car}
                color="bg-blue-600"
                subtitle={`${dashboardData?.totalCars || 0} listed in total`}
              />
              <StatCard
                title="Total Bookings"
                value={dashboardData?.totalBookings || 0}
                icon={Calendar}
                color="bg-purple-600"
                change={dashboardData?.bookingGrowth}
              />
              <StatCard
                title="Utilization Rate"
                value={`${dashboardData?.utilizationRate || 0}%`}
                icon={BarChart3}
                color="bg-orange-600"
                change={dashboardData?.utilizationChange}
              />
            </StaggerContainer>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Fleet Performance */}
              <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-white/20">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                  <span className="mr-2">🚀</span> Fleet Performance
                </h3>
                <div className="space-y-4">
                  {dashboardData.topPerformingCars.map((car: any) => (
                    <div key={car.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                          <Car size={20} className="text-blue-400" />
                        </div>
                        <div>
                          <p className="font-bold text-white">
                            {car.make} {car.model}
                          </p>
                          <p className="text-sm text-white/50">
                            {car.bookingCount} bookings
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-400 text-lg">
                          ${car.earnings.toLocaleString()}
                        </p>
                        <p className="text-sm text-white/50">
                          {car.utilizationRate}% utilized
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-white/20">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                  <span className="mr-2">⚡</span> Recent Activity
                </h3>
                <div className="space-y-4">
                  {dashboardData.recentBookings.map((booking: any) => (
                    <div key={booking.id} className="flex items-center space-x-4 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
                      <div className={`p-3 rounded-full ${booking.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                        booking.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/10 text-white/50'
                        }`}>
                        <Calendar size={18} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">
                          {booking.carDetails}
                        </p>
                        <p className="text-xs text-white/50 mt-1">
                          {booking.customerName} • {booking.dateRange}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-bold text-white">
                          ${booking.amount}
                        </p>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${booking.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                          booking.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/10 text-white/50'
                          }`}>
                          {booking.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Upcoming Maintenance Alert */}
            {dashboardData.upcomingMaintenance.length > 0 && (
              <div className="bg-gradient-to-r from-yellow-900/40 to-orange-900/40 border border-yellow-500/30 p-6 rounded-2xl backdrop-blur-md">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="bg-yellow-500/20 p-2 rounded-lg">
                    <AlertTriangle className="text-yellow-400" size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    Upcoming Maintenance
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {dashboardData.upcomingMaintenance.map((item: any) => (
                    <div key={item.id} className="bg-black/20 p-4 rounded-xl border border-white/10 hover:border-yellow-500/30 transition-colors">
                      <p className="font-bold text-white">
                        {item.carDetails}
                      </p>
                      <p className="text-sm text-white/60 mt-1">
                        {item.type} - {item.scheduledDate}
                      </p>
                      <p className="text-sm text-yellow-400 font-semibold mt-2">
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
          <div className="space-y-6 fade-in">
            <div className="flex justify-end">
              <button
                onClick={() => onNavigate && onNavigate('listcar')}
                className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                + Add New Vehicle
              </button>
            </div>
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.isArray(cars) && cars.length > 0 ? (
                cars.map((car) => (
                  <StaggerItem key={car.id}>
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl overflow-hidden border border-white/20 shadow-xl hover:transform hover:scale-105 transition-all duration-300 group h-full">
                      <div className="h-48 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative overflow-hidden">
                        {/* Placeholder or Image */}
                        {car.image ? (
                          <img src={car.image} alt={car.model} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                        ) : (
                          <Car size={64} className="text-white/20 group-hover:text-white/40 transition-colors" />
                        )}
                        <div className="absolute top-4 right-4">
                          <span className={`px-3 py-1 text-xs font-bold rounded-full border ${car.status === 'active' && car.available
                            ? 'bg-green-500/20 border-green-400/30 text-green-300'
                            : car.status === 'maintenance'
                              ? 'bg-yellow-500/20 border-yellow-400/30 text-yellow-300'
                              : 'bg-red-500/20 border-red-400/30 text-red-300'
                            }`}>
                            {car.status === 'active' && car.available ? 'Available' :
                              car.status === 'maintenance' ? 'Maintenance' : 'Unavailable'}
                          </span>
                        </div>
                      </div>
                      <div className="p-6">
                        <div className="mb-4">
                          <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
                            {car.make} {car.model}
                          </h3>
                          <p className="text-white/50 text-sm">{car.year} • {car.location}</p>
                        </div>

                        <div className="space-y-3 mb-6 bg-black/20 p-4 rounded-xl">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-white/60">Daily Rate</span>
                            <span className="font-bold text-white text-lg">
                              ${car.price_per_day}
                            </span>
                          </div>
                          <div className="w-full h-px bg-white/10"></div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-white/60">Mo. Earnings</span>
                            <span className="text-sm font-semibold text-green-400">
                              ${car.monthlyEarnings || 0}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-white/60">Utilization</span>
                            <span className="text-sm text-white">
                              {car.utilizationRate || 0}%
                            </span>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex space-x-3">
                            <ScaleInteraction className="flex-1">
                              <button
                                onClick={() => toggleCarAvailability(car.id, !car.available)}
                                className={`w-full px-4 py-2.5 rounded-lg text-sm font-bold transition-all shadow-lg ${car.available
                                  ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30'
                                  : 'bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/30'
                                  }`}
                              >
                                {car.available ? 'Set Unavailable' : 'Set Available'}
                              </button>
                            </ScaleInteraction>
                            <ScaleInteraction className="flex-1">
                              <button className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/20 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors">
                                Edit
                              </button>
                            </ScaleInteraction>
                          </div>

                          <ScaleInteraction>
                            <button
                              onClick={() => {
                                const type = prompt('Maintenance type:');
                                if (type) scheduleMaintenance(car.id, { type });
                              }}
                              className="w-full bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/30 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center space-x-2"
                            >
                              <Wrench size={16} />
                              <span>Schedule Maintenence</span>
                            </button>
                          </ScaleInteraction>
                        </div>
                      </div>
                    </div>
                  </StaggerItem>
                ))
              ) : (
                <StaggerItem>
                  <div className="col-span-full text-center py-20 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl">
                    <div className="bg-white/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Car className="text-white/30 h-10 w-10" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">No vehicles listed</h3>
                    <p className="text-white/60 mb-8 max-w-md mx-auto">Add your first vehicle to start earning with DriveKenya today.</p>
                    <ScaleInteraction>
                      <button
                        onClick={() => onNavigate && onNavigate('listcar')}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:shadow-xl transition-all"
                      >
                        Add Your First Car
                      </button>
                    </ScaleInteraction>
                  </div>
                </StaggerItem>
              )}
            </StaggerContainer>
          </div>
        )}

        {/* Earnings Tab */}
        {activeTab === 'earnings' && (
          <div className="space-y-8 fade-in">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard
                title="Gross Earnings"
                value={`$${(earnings.gross || 0).toLocaleString()}`}
                icon={DollarSign}
                color="bg-green-600"
              />
              <StatCard
                title="Platform Fees"
                value={`$${(earnings.platformFees || 0).toLocaleString()}`}
                icon={DollarSign}
                color="bg-red-500"
              />
              <StatCard
                title="Net Earnings"
                value={`$${(earnings.net || 0).toLocaleString()}`}
                icon={DollarSign}
                color="bg-blue-600"
              />
              <StatCard
                title="Commission Rate"
                value={`${earnings.commissionRate || 0}%`}
                icon={BarChart3}
                color="bg-purple-500"
              />
            </div>

            <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-white/20">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-white flex items-center">
                  <span className="mr-2">📈</span> Earnings Timeline
                </h3>
                <div className="flex space-x-2">
                  <span className="flex items-center text-xs text-white/50"><span className="w-3 h-3 rounded-full bg-green-500 mr-1"></span> Gross</span>
                  <span className="flex items-center text-xs text-white/50"><span className="w-3 h-3 rounded-full bg-blue-500 mr-1"></span> Net</span>
                </div>
              </div>

              <div className="h-[400px] w-full">
                {earnings.chartData && earnings.chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={earnings.chartData}>
                      <defs>
                        <linearGradient id="colorGross" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                      <XAxis
                        dataKey="period"
                        stroke="rgba(255,255,255,0.5)"
                        tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                      />
                      <YAxis
                        stroke="rgba(255,255,255,0.5)"
                        tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        dx={-10}
                        tickFormatter={(value) => `$${value}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(15, 23, 42, 0.9)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '12px',
                          color: '#fff',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                        }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Area type="monotone" dataKey="earnings" name="Gross" stroke="#10b981" strokeWidth={3} fillUrl="url(#colorGross)" />
                      <Area type="monotone" dataKey="net" name="Net" stroke="#3b82f6" strokeWidth={3} fillUrl="url(#colorNet)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-white/40">
                    <BarChart3 size={48} className="mb-4 opacity-50" />
                    <p>No earnings data available for this period</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Maintenance Tab */}
        {activeTab === 'maintenance' && (
          <div className="space-y-6 fade-in">
            <div className="flex justify-between items-center bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20">
              <div>
                <h3 className="text-xl font-bold text-white">Maintenance Records</h3>
                <p className="text-white/60 text-sm mt-1">Track service history and upcoming repairs</p>
              </div>
              <button
                onClick={() => setShowMaintenanceModal(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl flex items-center space-x-2 shadow-lg transition-all transform hover:scale-105 font-medium"
              >
                <Plus size={20} />
                <span>Add Record</span>
              </button>
            </div>

            {maintenance.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {maintenance.map((record: any) => (
                  <div key={record.id} className="bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/20 flex flex-col md:flex-row md:items-center justify-between hover:bg-white/15 transition-all group">
                    <div className="flex items-start space-x-4 mb-4 md:mb-0">
                      <div className="bg-blue-500/20 p-3 rounded-lg">
                        <Wrench className="text-blue-400 group-hover:rotate-12 transition-transform" size={24} />
                      </div>
                      <div>
                        <p className="font-bold text-white text-lg">{record.car_name} <span className="text-white/50 text-base font-normal">({record.license_plate})</span></p>
                        <p className="text-white/80 mt-1">{record.type} - <span className="text-white/60">{record.description}</span></p>
                        <p className="text-xs text-white/40 mt-2 bg-black/20 inline-block px-2 py-1 rounded">Provider: {record.provider}</p>
                      </div>
                    </div>

                    <div className="text-right pl-4 border-l border-white/10 md:border-l-0 md:pl-0">
                      <p className="text-2xl font-bold text-white">${record.cost}</p>
                      <p className="text-sm text-white/60 mb-2">{new Date(record.scheduled_date).toLocaleDateString()}</p>
                      <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wide ${record.status === 'completed' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                        record.status === 'scheduled' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-white/10 text-white/60 border border-white/10'
                        }`}>
                        {record.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl">
                <div className="bg-white/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Wrench className="text-white/30 h-10 w-10" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">No Maintenance Records</h3>
                <p className="text-white/60 mb-8">Keep your fleet in top condition by tracking maintenance.</p>
                <button
                  onClick={() => setShowMaintenanceModal(true)}
                  className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-8 py-3 rounded-full font-semibold transition-all"
                >
                  Log First Service
                </button>
              </div>
            )}
          </div>
        )}

        {/* Maintenance Modal */}
        {showMaintenanceModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900/90 border border-white/20 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative">
              {/* Modal Glow */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-600"></div>

              <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Schedule Maintenance</h3>
                <button onClick={() => setShowMaintenanceModal(false)} className="text-white/50 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-full">
                  ✕
                </button>
              </div>
              <form onSubmit={handleMaintenanceSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Select Vehicle</label>
                  <select
                    required
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    value={maintenanceForm.carId}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, carId: e.target.value })}
                  >
                    <option value="" className="text-slate-900">Select a car...</option>
                    {cars.map((car: any) => (
                      <option key={car.id} value={car.id} className="text-slate-900">{car.make} {car.model} ({car.license_plate})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Service Type</label>
                  <select
                    required
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    value={maintenanceForm.type}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, type: e.target.value })}
                  >
                    <option value="Service" className="text-slate-900">Regular Service</option>
                    <option value="Repair" className="text-slate-900">Repair</option>
                    <option value="Inspection" className="text-slate-900">Inspection</option>
                    <option value="Tires" className="text-slate-900">Tires</option>
                    <option value="Other" className="text-slate-900">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Date</label>
                  <input
                    type="date"
                    required
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all color-scheme-dark"
                    value={maintenanceForm.scheduledDate}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, scheduledDate: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">Cost (Est.)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/40">$</span>
                      <input
                        type="number"
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-white/30"
                        value={maintenanceForm.cost}
                        onChange={(e) => setMaintenanceForm({ ...maintenanceForm, cost: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">Provider</label>
                    <input
                      type="text"
                      placeholder="e.g. Toyota Kenya"
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-white/30"
                      value={maintenanceForm.provider}
                      onChange={(e) => setMaintenanceForm({ ...maintenanceForm, provider: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Details about the service..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-white/30"
                    value={maintenanceForm.description}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })}
                  ></textarea>
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowMaintenanceModal(false)}
                    className="flex-1 px-4 py-3 border border-white/20 rounded-xl text-white hover:bg-white/10 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
                  >
                    Schedule Service
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerDashboard;
