import { useState, useEffect } from 'react';
import { authStorage } from '../services/api';
import { showToast } from '../components/UIUtils';

const ManageCar = ({ carId, onClose, onUpdated }) => {
  const [loading, setLoading] = useState(true);
  const [car, setCar] = useState(null);
  const [activeTab, setActiveTab] = useState('specs'); // specs | media | availability
  
  // Specs state
  const [fuelType, setFuelType] = useState('');
  const [transmission, setTransmission] = useState('');
  const [category, setCategory] = useState('');
  
  // Media state
  const [mainImage, setMainImage] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [galleryImages, setGalleryImages] = useState([]);
  
  // Availability state
  const [availabilityStatus, setAvailabilityStatus] = useState('available');
  const [availabilityBlocks, setAvailabilityBlocks] = useState([]);
  const [newBlockStart, setNewBlockStart] = useState('');
  const [newBlockEnd, setNewBlockEnd] = useState('');
  const [newBlockStatus, setNewBlockStatus] = useState('booked');
  const [newBlockNote, setNewBlockNote] = useState('');

  useEffect(() => {
    loadCarData();
  }, [carId]);

  const loadCarData = async () => {
    try {
      setLoading(true);
      const token = authStorage.getToken();
      const response = await fetch(`http://localhost:5000/api/cars/${carId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success && data.data.car) {
        const carData = data.data.car;
        setCar(carData);
        setFuelType(carData.fuel_type || '');
        setTransmission(carData.transmission || '');
        setCategory(carData.category || '');
        setMainImage(carData.main_image_url || '');
        setVideoUrl(carData.video_url || '');
        setAvailabilityStatus(carData.availability_status || 'available');
        if (carData.gallery_json) {
          try {
            setGalleryImages(JSON.parse(carData.gallery_json));
          } catch (e) {
            setGalleryImages([]);
          }
        }
        // Load availability blocks
        loadAvailability();
      }
    } catch (error) {
      console.error('Failed to load car:', error);
      showToast('Failed to load car details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailability = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/cars/${carId}/availability`);
      const data = await response.json();
      if (data.success) {
        setAvailabilityBlocks(data.blocks || []);
      }
    } catch (error) {
      console.error('Failed to load availability:', error);
    }
  };

  const updateSpecs = async () => {
    try {
      const token = authStorage.getToken();
      const response = await fetch(`http://localhost:5000/api/cars/${carId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          fuel_type: fuelType,
          transmission,
          category
        })
      });
      const data = await response.json();
      if (data.success) {
        showToast('Specs updated successfully', 'success');
        if (onUpdated) onUpdated();
      } else {
        showToast(data.message || 'Failed to update specs', 'error');
      }
    } catch (error) {
      console.error('Failed to update specs:', error);
      showToast('Failed to update specs', 'error');
    }
  };

  const updateMedia = async () => {
    try {
      const token = authStorage.getToken();
      const response = await fetch(`http://localhost:5000/api/cars/${carId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          main_image_url: mainImage,
          video_url: videoUrl,
          gallery_json: JSON.stringify(galleryImages)
        })
      });
      const data = await response.json();
      if (data.success) {
        showToast('Media updated successfully', 'success');
        if (onUpdated) onUpdated();
      } else {
        showToast(data.message || 'Failed to update media', 'error');
      }
    } catch (error) {
      console.error('Failed to update media:', error);
      showToast('Failed to update media', 'error');
    }
  };

  const updateStatus = async (status) => {
    try {
      const token = authStorage.getToken();
      const response = await fetch(`http://localhost:5000/api/cars/${carId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const data = await response.json();
      if (data.success) {
        setAvailabilityStatus(status);
        showToast('Status updated successfully', 'success');
        if (onUpdated) onUpdated();
      } else {
        showToast(data.message || 'Failed to update status', 'error');
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      showToast('Failed to update status', 'error');
    }
  };

  const addAvailabilityBlock = async () => {
    if (!newBlockStart || !newBlockEnd) {
      showToast('Please select start and end dates', 'error');
      return;
    }
    try {
      const token = authStorage.getToken();
      const response = await fetch(`http://localhost:5000/api/cars/${carId}/availability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          start_date: newBlockStart,
          end_date: newBlockEnd,
          status: newBlockStatus,
          note: newBlockNote
        })
      });
      const data = await response.json();
      if (data.success) {
        showToast('Availability block added', 'success');
        setNewBlockStart('');
        setNewBlockEnd('');
        setNewBlockNote('');
        loadAvailability();
      } else {
        showToast(data.message || 'Failed to add block', 'error');
      }
    } catch (error) {
      console.error('Failed to add block:', error);
      showToast('Failed to add block', 'error');
    }
  };

  const deleteAvailabilityBlock = async (blockId) => {
    try {
      const token = authStorage.getToken();
      const response = await fetch(`http://localhost:5000/api/cars/${carId}/availability/${blockId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        showToast('Block deleted', 'success');
        loadAvailability();
      } else {
        showToast(data.message || 'Failed to delete block', 'error');
      }
    } catch (error) {
      console.error('Failed to delete block:', error);
      showToast('Failed to delete block', 'error');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-gray-700">Loading car details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">🚗 Manage Car</h2>
            <p className="text-white/80">{car?.make} {car?.model} ({car?.year})</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => setActiveTab('specs')}
            className={`flex-1 py-3 px-4 font-medium transition-colors ${
              activeTab === 'specs'
                ? 'border-b-2 border-blue-600 text-blue-600 bg-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            ⚙️ Specs
          </button>
          <button
            onClick={() => setActiveTab('media')}
            className={`flex-1 py-3 px-4 font-medium transition-colors ${
              activeTab === 'media'
                ? 'border-b-2 border-blue-600 text-blue-600 bg-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📸 Media
          </button>
          <button
            onClick={() => setActiveTab('availability')}
            className={`flex-1 py-3 px-4 font-medium transition-colors ${
              activeTab === 'availability'
                ? 'border-b-2 border-blue-600 text-blue-600 bg-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📅 Availability
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'specs' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fuel Type</label>
                <select
                  value={fuelType}
                  onChange={(e) => setFuelType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select fuel type</option>
                  <option value="petrol">Petrol</option>
                  <option value="diesel">Diesel</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="electric">Electric</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Transmission</label>
                <select
                  value={transmission}
                  onChange={(e) => setTransmission(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select transmission</option>
                  <option value="automatic">Automatic</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select category</option>
                  <option value="economy">Economy</option>
                  <option value="suv">SUV</option>
                  <option value="sedan">Sedan</option>
                  <option value="hatchback">Hatchback</option>
                  <option value="luxury">Luxury</option>
                  <option value="van">Van</option>
                  <option value="convertible">Convertible</option>
                </select>
              </div>
              <button
                onClick={updateSpecs}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors"
              >
                Save Specs
              </button>
            </div>
          )}

          {activeTab === 'media' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Main Image URL</label>
                <input
                  type="url"
                  value={mainImage}
                  onChange={(e) => setMainImage(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {mainImage && (
                  <img src={mainImage} alt="Preview" className="mt-2 w-full h-48 object-cover rounded-lg" />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Video URL (optional)</label>
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={updateMedia}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors"
              >
                Save Media
              </button>
            </div>
          )}

          {activeTab === 'availability' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Current Status</label>
                <div className="flex gap-3">
                  {['available', 'booked', 'maintenance'].map((status) => (
                    <button
                      key={status}
                      onClick={() => updateStatus(status)}
                      className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                        availabilityStatus === status
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-medium text-gray-900 mb-4">📅 Calendar Blocks</h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={newBlockStart}
                      onChange={(e) => setNewBlockStart(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">End Date</label>
                    <input
                      type="date"
                      value={newBlockEnd}
                      onChange={(e) => setNewBlockEnd(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Status</label>
                    <select
                      value={newBlockStatus}
                      onChange={(e) => setNewBlockStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="booked">Booked</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="available">Available</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Note (optional)</label>
                    <input
                      type="text"
                      value={newBlockNote}
                      onChange={(e) => setNewBlockNote(e.target.value)}
                      placeholder="e.g., Reserved for John"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <button
                  onClick={addAvailabilityBlock}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium transition-colors"
                >
                  + Add Block
                </button>

                <div className="mt-6 space-y-2">
                  {availabilityBlocks.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No availability blocks yet</p>
                  ) : (
                    availabilityBlocks.map((block) => (
                      <div
                        key={block.id}
                        className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              block.status === 'available' ? 'bg-green-100 text-green-700' :
                              block.status === 'booked' ? 'bg-blue-100 text-blue-700' :
                              'bg-orange-100 text-orange-700'
                            }`}>
                              {block.status}
                            </span>
                            <span className="text-sm text-gray-700 font-medium">
                              {new Date(block.start_date).toLocaleDateString()} - {new Date(block.end_date).toLocaleDateString()}
                            </span>
                          </div>
                          {block.note && <p className="text-sm text-gray-600">{block.note}</p>}
                        </div>
                        <button
                          onClick={() => deleteAvailabilityBlock(block.id)}
                          className="text-red-600 hover:text-red-800 font-medium text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageCar;
