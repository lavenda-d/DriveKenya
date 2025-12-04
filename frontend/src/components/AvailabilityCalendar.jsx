import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Edit, 
  Trash2, 
  Clock,
  Wrench,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import 'react-calendar/dist/Calendar.css';

const AvailabilityCalendar = ({ carId, onAvailabilityChange }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availabilityBlocks, setAvailabilityBlocks] = useState([]);
  const [maintenanceSchedule, setMaintenanceSchedule] = useState([]);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockData, setBlockData] = useState({
    startDate: '',
    endDate: '',
    type: 'owner_block',
    reason: ''
  });

  useEffect(() => {
    fetchAvailabilityData();
  }, [carId]);

  const fetchAvailabilityData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [blocksResponse, maintenanceResponse] = await Promise.all([
        fetch(`/api/owner/cars/${carId}/availability-blocks`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/owner/cars/${carId}/maintenance`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const blocksData = await blocksResponse.json();
      const maintenanceData = await maintenanceResponse.json();

      if (blocksData.success) setAvailabilityBlocks(blocksData.blocks || []);
      if (maintenanceData.success) setMaintenanceSchedule(maintenanceData.maintenance || []);
    } catch (error) {
      console.error('Failed to fetch availability data:', error);
    }
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    setBlockData({
      ...blockData,
      startDate: date.toISOString().split('T')[0]
    });
    setShowBlockModal(true);
  };

  const createAvailabilityBlock = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/owner/cars/${carId}/availability-blocks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(blockData)
      });

      const data = await response.json();
      if (data.success) {
        fetchAvailabilityData();
        setShowBlockModal(false);
        setBlockData({ startDate: '', endDate: '', type: 'owner_block', reason: '' });
        if (onAvailabilityChange) onAvailabilityChange();
      }
    } catch (error) {
      console.error('Failed to create availability block:', error);
    }
  };

  const deleteBlock = async (blockId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/owner/cars/${carId}/availability-blocks/${blockId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        fetchAvailabilityData();
        if (onAvailabilityChange) onAvailabilityChange();
      }
    } catch (error) {
      console.error('Failed to delete block:', error);
    }
  };

  const getTileClassName = ({ date, view }) => {
    if (view !== 'month') return '';
    
    const dateStr = date.toISOString().split('T')[0];
    const classes = [];

    // Check for availability blocks
    const hasBlock = availabilityBlocks.some(block => 
      dateStr >= block.start_date && dateStr <= block.end_date
    );
    
    // Check for maintenance
    const hasMaintenance = maintenanceSchedule.some(maintenance => 
      dateStr === maintenance.scheduled_date
    );

    if (hasBlock) classes.push('unavailable-date');
    if (hasMaintenance) classes.push('maintenance-date');
    
    return classes.join(' ');
  };

  const getTileContent = ({ date, view }) => {
    if (view !== 'month') return null;
    
    const dateStr = date.toISOString().split('T')[0];
    const maintenance = maintenanceSchedule.find(m => m.scheduled_date === dateStr);
    
    if (maintenance) {
      return (
        <div className="tile-content">
          <Wrench size={12} className="text-orange-600" />
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <CalendarIcon className="mr-2" size={20} />
          Availability Calendar
        </h3>
        <button
          onClick={() => setShowBlockModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700"
        >
          <Plus size={16} />
          <span>Block Dates</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Calendar
            onChange={setSelectedDate}
            value={selectedDate}
            onClickDay={handleDateClick}
            tileClassName={getTileClassName}
            tileContent={getTileContent}
            className="react-calendar-custom"
          />
          
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-200 rounded"></div>
              <span>Blocked</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-orange-200 rounded"></div>
              <span>Maintenance</span>
            </div>
          </div>
        </div>

        {/* Availability Blocks List */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-4">Upcoming Blocks</h4>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {availabilityBlocks.map((block) => (
              <div key={block.id} className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm text-gray-900">
                      {block.type.replace('_', ' ').toUpperCase()}
                    </p>
                    <p className="text-xs text-gray-600">
                      {block.start_date} - {block.end_date}
                    </p>
                    {block.reason && (
                      <p className="text-xs text-gray-500 mt-1">{block.reason}</p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteBlock(block.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            
            {maintenanceSchedule.map((maintenance) => (
              <div key={maintenance.id} className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm text-orange-900 flex items-center">
                      <Wrench size={14} className="mr-1" />
                      {maintenance.type.replace('_', ' ').toUpperCase()}
                    </p>
                    <p className="text-xs text-orange-700">
                      {maintenance.scheduled_date}
                    </p>
                    {maintenance.description && (
                      <p className="text-xs text-orange-600 mt-1">{maintenance.description}</p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    maintenance.status === 'completed' ? 'bg-green-100 text-green-800' :
                    maintenance.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {maintenance.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Block Dates Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Block Availability</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={blockData.startDate}
                  onChange={(e) => setBlockData({...blockData, startDate: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={blockData.endDate}
                  onChange={(e) => setBlockData({...blockData, endDate: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Block Type
                </label>
                <select
                  value={blockData.type}
                  onChange={(e) => setBlockData({...blockData, type: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="owner_block">Personal Use</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="admin_block">Admin Block</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason (Optional)
                </label>
                <textarea
                  value={blockData.reason}
                  onChange={(e) => setBlockData({...blockData, reason: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Enter reason for blocking these dates..."
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={createAvailabilityBlock}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Create Block
              </button>
              <button
                onClick={() => setShowBlockModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .react-calendar-custom .unavailable-date {
          background-color: #fee2e2 !important;
          color: #dc2626 !important;
        }
        .react-calendar-custom .maintenance-date {
          background-color: #fef3c7 !important;
          color: #d97706 !important;
        }
        .tile-content {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100%;
        }
      `}</style>
    </div>
  );
};

export default AvailabilityCalendar;