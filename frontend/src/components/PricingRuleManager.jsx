import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  DollarSign,
  Calendar,
  TrendingUp,
  MapPin
} from 'lucide-react';

const PricingRuleManager = () => {
  const [rules, setRules] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [ruleForm, setRuleForm] = useState({
    name: '',
    description: '',
    rule_type: 'time_based',
    multiplier: 1.0,
    priority: 1,
    active: true,
    valid_from: '',
    valid_to: '',
    conditions: {}
  });

  useEffect(() => {
    fetchPricingRules();
  }, []);

  const fetchPricingRules = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/pricing/rules', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setRules(data.rules);
      }
    } catch (error) {
      console.error('Failed to fetch pricing rules:', error);
    }
  };

  const validateRule = () => {
    const errors = {};
    
    // Required field validation
    if (!ruleForm.name.trim()) {
      errors.name = 'Rule name is required';
    }
    
    if (!ruleForm.description.trim()) {
      errors.description = 'Description is required';
    }
    
    // Multiplier validation
    if (ruleForm.multiplier < 0.1 || ruleForm.multiplier > 10) {
      errors.multiplier = 'Multiplier must be between 0.1 and 10';
    }
    
    // Priority validation
    if (ruleForm.priority < 1 || ruleForm.priority > 100) {
      errors.priority = 'Priority must be between 1 and 100';
    }
    
    // Date range validation
    if (ruleForm.valid_from && ruleForm.valid_to) {
      const fromDate = new Date(ruleForm.valid_from);
      const toDate = new Date(ruleForm.valid_to);
      
      if (fromDate >= toDate) {
        errors.valid_to = 'End date must be after start date';
      }
    }
    
    // Rule type specific validation
    switch (ruleForm.rule_type) {
      case 'time_based':
        if (!ruleForm.conditions.weekends && !ruleForm.conditions.holidays && !ruleForm.conditions.peakMonths) {
          errors.conditions = 'At least one time-based condition must be specified';
        }
        break;
        
      case 'seasonal':
        if (!ruleForm.conditions.seasons || ruleForm.conditions.seasons.length === 0) {
          errors.conditions = 'At least one season must be specified';
        }
        break;
        
      case 'distance_based':
        if (!ruleForm.conditions.minDistance) {
          errors.conditions = 'Minimum distance must be specified';
        }
        break;
    }
    
    // Check for rule conflicts
    const conflictingRules = rules.filter(rule => 
      rule.id !== editingRule?.id &&
      rule.rule_type === ruleForm.rule_type &&
      rule.active &&
      isDateRangeOverlap(rule, ruleForm)
    );
    
    if (conflictingRules.length > 0) {
      errors.conflict = `Conflicts with existing rule: ${conflictingRules[0].name}`;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const isDateRangeOverlap = (rule1, rule2) => {
    if (!rule1.valid_from || !rule1.valid_to || !rule2.valid_from || !rule2.valid_to) {
      return false; // No overlap if dates not specified
    }
    
    const start1 = new Date(rule1.valid_from);
    const end1 = new Date(rule1.valid_to);
    const start2 = new Date(rule2.valid_from);
    const end2 = new Date(rule2.valid_to);
    
    return start1 <= end2 && start2 <= end1;
  };

  const calculatePricePreview = () => {
    // Simple preview calculation
    const basePrice = 100; // Sample base price
    const previewPrice = basePrice * ruleForm.multiplier;
    const impact = ((previewPrice - basePrice) / basePrice * 100).toFixed(1);
    
    return {
      basePrice,
      adjustedPrice: previewPrice.toFixed(2),
      impact: impact >= 0 ? `+${impact}%` : `${impact}%`
    };
  };

  const handleSaveRule = async () => {
    if (!validateRule()) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = editingRule 
        ? `/api/pricing/rules/${editingRule.id}`
        : '/api/pricing/rules';
      
      const response = await fetch(url, {
        method: editingRule ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ruleForm)
      });
      
      const data = await response.json();
      if (data.success) {
        fetchPricingRules();
        handleCloseModal();
      } else {
        setValidationErrors({ submit: data.error || 'Failed to save rule' });
      }
    } catch (error) {
      setValidationErrors({ submit: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!confirm('Are you sure you want to delete this pricing rule?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/pricing/rules/${ruleId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      if (data.success) {
        fetchPricingRules();
      }
    } catch (error) {
      console.error('Failed to delete rule:', error);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRule(null);
    setValidationErrors({});
    setRuleForm({
      name: '',
      description: '',
      rule_type: 'time_based',
      multiplier: 1.0,
      priority: 1,
      active: true,
      valid_from: '',
      valid_to: '',
      conditions: {}
    });
  };

  const handleEditRule = (rule) => {
    setEditingRule(rule);
    setRuleForm({
      ...rule,
      conditions: rule.conditions || {}
    });
    setShowModal(true);
  };

  const getRuleIcon = (type) => {
    switch (type) {
      case 'time_based': return Clock;
      case 'seasonal': return Calendar;
      case 'demand_based': return TrendingUp;
      case 'distance_based': return MapPin;
      default: return DollarSign;
    }
  };

  const preview = calculatePricePreview();

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Dynamic Pricing Rules
        </h3>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700"
        >
          <Plus size={16} />
          <span>Add Rule</span>
        </button>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {rules.map((rule) => {
          const IconComponent = getRuleIcon(rule.rule_type);
          
          return (
            <div key={rule.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${
                    rule.active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <IconComponent size={16} />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{rule.name}</h4>
                    <p className="text-sm text-gray-600">{rule.description}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>Type: {rule.rule_type.replace('_', ' ')}</span>
                      <span>Multiplier: {rule.multiplier}x</span>
                      <span>Priority: {rule.priority}</span>
                      {rule.valid_from && (
                        <span>
                          Valid: {new Date(rule.valid_from).toLocaleDateString()} - {' '}
                          {rule.valid_to ? new Date(rule.valid_to).toLocaleDateString() : 'Forever'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    rule.active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {rule.active ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    onClick={() => handleEditRule(rule)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rule Creation/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingRule ? 'Edit Pricing Rule' : 'Create Pricing Rule'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rule Name *
                </label>
                <input
                  type="text"
                  value={ruleForm.name}
                  onChange={(e) => setRuleForm({...ruleForm, name: e.target.value})}
                  className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Weekend Premium"
                />
                {validationErrors.name && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.name}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rule Type *
                </label>
                <select
                  value={ruleForm.rule_type}
                  onChange={(e) => setRuleForm({...ruleForm, rule_type: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="time_based">Time Based</option>
                  <option value="seasonal">Seasonal</option>
                  <option value="demand_based">Demand Based</option>
                  <option value="distance_based">Distance Based</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price Multiplier *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="10"
                  value={ruleForm.multiplier}
                  onChange={(e) => setRuleForm({...ruleForm, multiplier: parseFloat(e.target.value)})}
                  className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.multiplier ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {validationErrors.multiplier && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.multiplier}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={ruleForm.priority}
                  onChange={(e) => setRuleForm({...ruleForm, priority: parseInt(e.target.value)})}
                  className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.priority ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {validationErrors.priority && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.priority}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valid From
                </label>
                <input
                  type="date"
                  value={ruleForm.valid_from}
                  onChange={(e) => setRuleForm({...ruleForm, valid_from: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valid To
                </label>
                <input
                  type="date"
                  value={ruleForm.valid_to}
                  onChange={(e) => setRuleForm({...ruleForm, valid_to: e.target.value})}
                  className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.valid_to ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {validationErrors.valid_to && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.valid_to}</p>
                )}
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                value={ruleForm.description}
                onChange={(e) => setRuleForm({...ruleForm, description: e.target.value})}
                className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.description ? 'border-red-500' : 'border-gray-300'
                }`}
                rows="3"
                placeholder="Describe when this rule applies..."
              />
              {validationErrors.description && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.description}</p>
              )}
            </div>
            
            <div className="flex items-center mt-4">
              <input
                type="checkbox"
                id="active"
                checked={ruleForm.active}
                onChange={(e) => setRuleForm({...ruleForm, active: e.target.checked})}
                className="mr-2"
              />
              <label htmlFor="active" className="text-sm font-medium text-gray-700">
                Active Rule
              </label>
            </div>

            {/* Price Preview */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Price Preview</h4>
              <div className="flex items-center justify-between text-sm">
                <span>Base Price: ${preview.basePrice}</span>
                <span>Adjusted Price: ${preview.adjustedPrice}</span>
                <span className={`font-medium ${
                  preview.impact.startsWith('+') ? 'text-green-600' : 'text-red-600'
                }`}>
                  Impact: {preview.impact}
                </span>
              </div>
            </div>
            
            {/* Validation Errors */}
            {(validationErrors.conditions || validationErrors.conflict || validationErrors.submit) && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertTriangle size={16} className="text-red-600" />
                  <span className="text-red-800 font-medium">Validation Error</span>
                </div>
                {validationErrors.conditions && (
                  <p className="text-red-700 text-sm mt-1">{validationErrors.conditions}</p>
                )}
                {validationErrors.conflict && (
                  <p className="text-red-700 text-sm mt-1">{validationErrors.conflict}</p>
                )}
                {validationErrors.submit && (
                  <p className="text-red-700 text-sm mt-1">{validationErrors.submit}</p>
                )}
              </div>
            )}
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleSaveRule}
                disabled={loading}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : (editingRule ? 'Update Rule' : 'Create Rule')}
              </button>
              <button
                onClick={handleCloseModal}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingRuleManager;