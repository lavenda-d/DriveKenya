import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, AlertTriangle, Eye, UserX, TrendingUp, Filter } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

const FraudDetectionDashboard = () => {
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({});
  const [riskTrends, setRiskTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [timeRange, setTimeRange] = useState('24h');

  useEffect(() => {
    fetchFraudData();
  }, [filter, timeRange]);

  const fetchFraudData = async () => {
    setLoading(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const [alertsRes, statsRes, trendsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/fraud/alerts?filter=${filter}&range=${timeRange}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }).catch(() => ({ ok: false })),
        fetch(`${API_BASE_URL}/api/fraud/stats?range=${timeRange}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }).catch(() => ({ ok: false })),
        fetch(`${API_BASE_URL}/api/fraud/trends?range=${timeRange}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }).catch(() => ({ ok: false }))
      ]);

      if (alertsRes.ok && statsRes.ok && trendsRes.ok) {
        const alertsData = await alertsRes.json();
        const statsData = await statsRes.json();
        const trendsData = await trendsRes.json();

        setAlerts(alertsData.alerts || []);
        setStats(statsData.stats || {});
        setRiskTrends(trendsData.trends || []);
      } else {
        // Use mock data
        setAlerts([]);
        setStats({ totalAlerts: 0, highRisk: 0, mediumRisk: 0, lowRisk: 0 });
        setRiskTrends([]);
      }
    } catch (error) {
      console.error('Failed to fetch fraud data:', error);
      setAlerts([]);
      setStats({ totalAlerts: 0, highRisk: 0, mediumRisk: 0, lowRisk: 0 });
      setRiskTrends([]);
    }
    setLoading(false);
  };

  const handleAlertAction = async (alertId, action) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/fraud/alerts/${alertId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ action })
      });

      fetchFraudData(); // Refresh data
    } catch (error) {
      console.error('Failed to handle alert action:', error);
    }
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'CRITICAL': return 'text-red-600 bg-red-50 border-red-200';
      case 'HIGH': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const riskDistribution = [
    { name: 'Low', value: stats.lowRisk || 0, fill: '#22c55e' },
    { name: 'Medium', value: stats.mediumRisk || 0, fill: '#f59e0b' },
    { name: 'High', value: stats.highRisk || 0, fill: '#f97316' },
    { name: 'Critical', value: stats.criticalRisk || 0, fill: '#dc2626' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Shield className="text-red-500" size={24} />
          <h2 className="text-2xl font-bold">{t('security.fraudDetection')}</h2>
        </div>

        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Alerts</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="HIGH">High Risk</option>
            <option value="pending">Pending Review</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className="text-red-500" size={24} />
            </div>
            <div className="ml-3">
              <div className="text-sm font-medium text-gray-500">Active Alerts</div>
              <div className="text-2xl font-bold">{stats.activeAlerts || 0}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="text-orange-500" size={24} />
            </div>
            <div className="ml-3">
              <div className="text-sm font-medium text-gray-500">Risk Score Avg</div>
              <div className="text-2xl font-bold">{(stats.avgRiskScore || 0).toFixed(2)}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UserX className="text-red-500" size={24} />
            </div>
            <div className="ml-3">
              <div className="text-sm font-medium text-gray-500">Blocked Users</div>
              <div className="text-2xl font-bold">{stats.blockedUsers || 0}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Eye className="text-blue-500" size={24} />
            </div>
            <div className="ml-3">
              <div className="text-sm font-medium text-gray-500">Investigations</div>
              <div className="text-2xl font-bold">{stats.investigations || 0}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Risk Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={riskTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="riskScore" stroke="#dc2626" strokeWidth={2} />
              <Line type="monotone" dataKey="alerts" stroke="#f97316" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Risk Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={riskDistribution}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {riskDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Fraud Alerts Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Recent Fraud Alerts</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {alerts.map((alert) => (
                <tr key={alert.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {alert.user_email}
                    </div>
                    <div className="text-sm text-gray-500">ID: {alert.user_id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{alert.action}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRiskColor(alert.risk_level)}`}>
                      {alert.risk_level}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {(alert.risk_score * 100).toFixed(1)}%
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(alert.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${alert.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      alert.status === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                      {alert.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    {alert.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleAlertAction(alert.id, 'investigate')}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Investigate
                        </button>
                        <button
                          onClick={() => handleAlertAction(alert.id, 'block')}
                          className="text-red-600 hover:text-red-900"
                        >
                          Block User
                        </button>
                        <button
                          onClick={() => handleAlertAction(alert.id, 'false_positive')}
                          className="text-green-600 hover:text-green-900"
                        >
                          False Positive
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FraudDetectionDashboard;