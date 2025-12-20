import React, { useState, useEffect, useCallback } from 'react';
import {
    Calculator,
    Calendar,
    Clock,
    TrendingUp,
    Shield,
    CheckCircle,
    ChevronRight,
    Sparkles
} from 'lucide-react';
import { StaggerContainer, StaggerItem, ScaleInteraction, showToast } from './UIUtils';
import { Car } from '../types/car';

interface PricingBreakdown {
    basePricePerDay: number;
    totalDays: number;
    platformFeeRate: string;
    insuranceFeeRate: string;
    multiplierApplied: string;
}

interface PricingPreview {
    durationInDays: number;
    basePrice: number;
    platformFee: number;
    insuranceFee: number;
    totalPrice: number;
    surcharge: boolean;
    savings: boolean;
    breakdown: PricingBreakdown;
}

interface PricingCalculatorProps {
    carId?: string | number;
    onPriceCalculated?: (pricing: PricingPreview) => void;
    onBookCar?: (data: any) => void;
}

const PricingCalculator: React.FC<PricingCalculatorProps> = ({ carId, onPriceCalculated, onBookCar }) => {
    const [selectedCarId, setSelectedCarId] = useState<string | number>(carId || '');
    const [availableCars, setAvailableCars] = useState<Car[]>([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [pickupLocation, setPickupLocation] = useState('');
    const [dropoffLocation, setDropoffLocation] = useState('');
    const [pricing, setPricing] = useState<PricingPreview | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const locations = [
        'Nairobi CBD', 'Westlands', 'Karen', 'Kiambu',
        'Thika', 'Machakos', 'Nakuru', 'Eldoret'
    ];

    const fetchCars = useCallback(async () => {
        try {
            const response = await fetch('http://localhost:5000/api/cars');
            const data = await response.json();
            if (data.success) {
                setAvailableCars(data.data?.cars || []);
            }
        } catch (error) {
            console.error('Failed to fetch cars:', error);
        }
    }, []);

    useEffect(() => {
        fetchCars();
    }, [fetchCars]);

    const calculatePricing = useCallback(async () => {
        if (!selectedCarId || !startDate || !endDate) return;

        try {
            setLoading(true);
            setError('');

            const response = await fetch('http://localhost:5000/api/pricing/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    carId: selectedCarId,
                    startDate,
                    endDate,
                    pickupLocation: pickupLocation || null,
                    dropoffLocation: dropoffLocation || null
                })
            });

            const data = await response.json();

            if (data.success) {
                setPricing(data.preview);
                if (onPriceCalculated) onPriceCalculated(data.preview);
            } else {
                setError(data.error || 'Failed to calculate pricing');
                setPricing(null);
            }
        } catch (error) {
            console.error('Pricing calculation error:', error);
            setError('Failed to calculate pricing');
            setPricing(null);
        } finally {
            setLoading(false);
        }
    }, [selectedCarId, startDate, endDate, pickupLocation, dropoffLocation, onPriceCalculated]);

    useEffect(() => {
        calculatePricing();
    }, [calculatePricing]);

    const handleBookNow = () => {
        if (!selectedCarId || !startDate || !endDate) {
            showToast('Please select a car and dates to book', 'error');
            return;
        }

        const selectedCar = availableCars.find(car => car.id === String(selectedCarId));
        if (!selectedCar) {
            showToast('Selected car not found', 'error');
            return;
        }

        if (onBookCar) {
            onBookCar({
                car: selectedCar,
                startDate,
                endDate,
                pickupLocation,
                dropoffLocation,
                pricing
            });
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    };

    const isWeekend = (dateString: string) => {
        const day = new Date(dateString).getDay();
        return day === 0 || day === 6;
    };

    const PriceBreakdownItem = ({ label, amount, description, highlight = false }: any) => (
        <div className={`flex justify-between items-start py-3 ${highlight ? 'border-t border-white/10 mt-2 pt-4' : ''}`}>
            <div className="flex-1">
                <span className={`block font-medium ${highlight ? 'text-xl text-white' : 'text-white/70'}`}>
                    {label}
                </span>
                {description && (
                    <p className="text-xs text-white/40 mt-1 leading-relaxed">{description}</p>
                )}
            </div>
            <div className="text-right">
                <span className={`font-bold ${highlight ? 'text-2xl text-blue-400' : 'text-white'}`}>
                    KSh {amount?.toLocaleString()}
                </span>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-transparent pt-24 pb-20">
            <div className="max-w-5xl mx-auto px-6">
                <StaggerContainer>
                    {/* Header Card */}
                    <StaggerItem>
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 md:p-12 mb-8 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-blue-600/20 transition-all duration-700"></div>

                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                                <div className="max-w-2xl">
                                    <div className="inline-flex items-center space-x-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 mb-6">
                                        <Sparkles size={16} className="text-blue-400 animate-pulse" />
                                        <span className="text-blue-400 text-xs font-bold uppercase tracking-widest">Intelligent Rates</span>
                                    </div>
                                    <h1 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight leading-tight">
                                        Dynamic Pricing <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 text-shadow-glow">Calculator</span>
                                    </h1>
                                    <p className="text-white/60 text-lg font-medium leading-relaxed">
                                        Our smart algorithm analyzes demand, vehicle season, and rental duration to give you the most competitive rates in real-time. Transparent pricing with no hidden fees.
                                    </p>
                                </div>
                                <div className="flex-shrink-0">
                                    <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center border border-white/10 shadow-2xl">
                                        <Calculator size={48} className="text-blue-400" />
                                    </div>
                                </div>
                            </div>

                            {/* Benefits Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 pt-8 border-t border-white/5 relative z-10">
                                <div className="flex items-center space-x-3 text-white/60">
                                    <CheckCircle size={18} className="text-green-400" />
                                    <span className="text-sm font-semibold">Real-time Rates</span>
                                </div>
                                <div className="flex items-center space-x-3 text-white/60">
                                    <CheckCircle size={18} className="text-green-400" />
                                    <span className="text-sm font-semibold">Peak Demand Info</span>
                                </div>
                                <div className="flex items-center space-x-3 text-white/60">
                                    <CheckCircle size={18} className="text-green-400" />
                                    <span className="text-sm font-semibold">Full Transparency</span>
                                </div>
                                <div className="flex items-center space-x-3 text-white/60">
                                    <CheckCircle size={18} className="text-green-400" />
                                    <span className="text-sm font-semibold">Instant Savings</span>
                                </div>
                            </div>
                        </div>
                    </StaggerItem>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        {/* Input Section */}
                        <div className="lg:col-span-7 space-y-6">
                            <StaggerItem>
                                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 shadow-2xl">
                                    <h3 className="text-xl font-bold text-white mb-8 flex items-center">
                                        <span className="p-2 bg-blue-500/20 rounded-lg mr-3">🚗</span>
                                        Configure Your Rental
                                    </h3>

                                    <div className="space-y-6">
                                        {/* Car Selection */}
                                        <div>
                                            <label className="block text-white/50 text-xs font-black uppercase tracking-widest mb-3 ml-1">
                                                Select Premium Fleet
                                            </label>
                                            <select
                                                value={selectedCarId}
                                                onChange={(e) => setSelectedCarId(e.target.value)}
                                                className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white/10 transition-all appearance-none cursor-pointer"
                                            >
                                                <option value="" className="bg-slate-900 text-white">Choose a vehicle...</option>
                                                {availableCars.map((car) => (
                                                    <option key={car.id} value={car.id} className="bg-slate-900 text-white">
                                                        {car.make} {car.model} ({car.year}) • KSh {car.price_per_day}/day
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Date Picker Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-white/50 text-xs font-black uppercase tracking-widest mb-3 ml-1">
                                                    Pickup Date
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="date"
                                                        value={startDate}
                                                        onChange={(e) => setStartDate(e.target.value)}
                                                        min={new Date().toISOString().split('T')[0]}
                                                        className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white/10 transition-all cursor-pointer"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-white/50 text-xs font-black uppercase tracking-widest mb-3 ml-1">
                                                    Return Date
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="date"
                                                        value={endDate}
                                                        onChange={(e) => setEndDate(e.target.value)}
                                                        min={startDate || new Date().toISOString().split('T')[0]}
                                                        className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white/10 transition-all cursor-pointer"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Locations */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-white/50 text-xs font-black uppercase tracking-widest mb-3 ml-1">
                                                    Pickup Point
                                                </label>
                                                <select
                                                    value={pickupLocation}
                                                    onChange={(e) => setPickupLocation(e.target.value)}
                                                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white/10 transition-all appearance-none cursor-pointer"
                                                >
                                                    <option value="" className="bg-slate-900 text-white">Select Branch</option>
                                                    {locations.map((loc) => (
                                                        <option key={loc} value={loc} className="bg-slate-900 text-white">{loc}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-white/50 text-xs font-black uppercase tracking-widest mb-3 ml-1">
                                                    Dropoff Point
                                                </label>
                                                <select
                                                    value={dropoffLocation}
                                                    onChange={(e) => setDropoffLocation(e.target.value)}
                                                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white/10 transition-all appearance-none cursor-pointer"
                                                >
                                                    <option value="" className="bg-slate-900 text-white">Select Branch</option>
                                                    {locations.map((loc) => (
                                                        <option key={loc} value={loc} className="bg-slate-900 text-white">{loc}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </StaggerItem>

                            {/* Inclusion Cards */}
                            <StaggerItem>
                                <div className="bg-gradient-to-br from-blue-600/10 to-purple-600/10 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8">
                                    <div className="flex items-center space-x-3 mb-6">
                                        <Shield className="text-blue-400" size={24} />
                                        <h4 className="text-xl font-bold text-white tracking-tight">DriveKenya Premium Assurance</h4>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {[
                                            'Comprehensive Insurance included',
                                            '24/7 Concierge Roadside Assist',
                                            'Zero Hidden Charges Policy',
                                            'Flexible Reservation Changes'
                                        ].map((benefit, i) => (
                                            <div key={i} className="flex items-center space-x-3 bg-white/5 p-4 rounded-xl border border-white/5">
                                                <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
                                                <span className="text-white/70 text-sm font-medium">{benefit}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </StaggerItem>
                        </div>

                        {/* Results Section */}
                        <div className="lg:col-span-5">
                            <div className="sticky top-32">
                                <StaggerItem>
                                    <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[2.5rem] p-8 shadow-3xl relative overflow-hidden">
                                        {/* Spotlight effect for the result */}
                                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] pointer-events-none animate-pulse"></div>

                                        <h3 className="text-xl font-bold text-white mb-8 flex items-center relative z-10">
                                            <span className="p-2 bg-purple-500/20 rounded-lg mr-3">💎</span>
                                            Selection Summary
                                        </h3>

                                        {error && (
                                            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-red-400 text-sm font-medium mb-6 animate-pulse">
                                                ⚠️ {error}
                                            </div>
                                        )}

                                        {!pricing && !loading && !error && (
                                            <div className="text-center py-20 px-6">
                                                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
                                                    <Clock className="text-white/20 animate-spin-slow" size={32} />
                                                </div>
                                                <p className="text-white/40 font-medium">Configure options to reveal instant pricing</p>
                                            </div>
                                        )}

                                        {loading && (
                                            <div className="text-center py-20">
                                                <div className="flex justify-center space-x-2 mb-6">
                                                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
                                                    <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce delay-100"></div>
                                                    <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce delay-200"></div>
                                                </div>
                                                <p className="text-blue-400 font-black uppercase tracking-widest text-xs">Computing Rates...</p>
                                            </div>
                                        )}

                                        {pricing && !loading && (
                                            <div className="space-y-6 animate-fade-in relative z-10">
                                                {/* Summary Box */}
                                                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                                    <div className="flex justify-between items-center mb-4">
                                                        <span className="text-white/50 text-xs font-black uppercase tracking-widest">Duration</span>
                                                        <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                                                            {pricing.durationInDays} {pricing.durationInDays === 1 ? 'Day' : 'Days'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center text-white font-bold">
                                                        <Calendar size={14} className="text-blue-400 mr-2" />
                                                        <span className="text-sm">{formatDate(startDate)}</span>
                                                        <ChevronRight size={14} className="mx-2 text-white/20" />
                                                        <span className="text-sm">{formatDate(endDate)}</span>
                                                    </div>
                                                    {(isWeekend(startDate) || isWeekend(endDate)) && (
                                                        <div className="mt-4 flex items-center text-yellow-400 text-xs font-bold uppercase tracking-widest">
                                                            <Sparkles size={12} className="mr-1" /> Weekend Premium Applied
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Breakdown */}
                                                <div className="space-y-1">
                                                    <PriceBreakdownItem
                                                        label="Base Rental Fee"
                                                        amount={pricing.basePrice}
                                                        description={`KSh ${pricing.breakdown.basePricePerDay}/day × ${pricing.breakdown.totalDays} days`}
                                                    />
                                                    <PriceBreakdownItem
                                                        label="Safe Ride Insurance"
                                                        amount={pricing.insuranceFee}
                                                        description={`${pricing.breakdown.insuranceFeeRate} comprehensive coverage`}
                                                    />
                                                    <PriceBreakdownItem
                                                        label="Platform Service"
                                                        amount={pricing.platformFee}
                                                        description="24/7 Support & Maintenance"
                                                    />

                                                    <PriceBreakdownItem
                                                        label="Estimated Total"
                                                        amount={pricing.totalPrice}
                                                        highlight={true}
                                                    />
                                                </div>

                                                {/* Peak Info */}
                                                {pricing.surcharge && (
                                                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 flex items-start space-x-3">
                                                        <TrendingUp className="text-orange-400 mt-1 flex-shrink-0" size={18} />
                                                        <div>
                                                            <p className="text-orange-400 text-sm font-bold">Peak Pricing Active</p>
                                                            <p className="text-orange-400/60 text-xs mt-0.5">Rates are higher due to extraordinary demand.</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Call to Action */}
                                                <div className="pt-6">
                                                    <ScaleInteraction>
                                                        <button
                                                            onClick={handleBookNow}
                                                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-2xl shadow-blue-900/50 transition-all border border-white/10"
                                                        >
                                                            Reserve This Vehicle
                                                        </button>
                                                    </ScaleInteraction>
                                                    <p className="text-white/30 text-[10px] text-center mt-4 font-bold uppercase tracking-tighter">
                                                        Final price confirmed at secure checkout
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </StaggerItem>
                            </div>
                        </div>
                    </div>
                </StaggerContainer>
            </div>
        </div>
    );
};

export default PricingCalculator;
