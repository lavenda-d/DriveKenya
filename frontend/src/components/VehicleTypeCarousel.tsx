import React, { useState, useRef, useEffect } from 'react';
import {
    FaChevronLeft,
    FaChevronRight,
    FaShuttleVan
} from 'react-icons/fa';
import {
    GiCarSeat,
    GiJeep,
    GiDiamondRing,
    GiRaceCar,
    GiFullMotorcycleHelmet,
    GiMountainRoad
} from 'react-icons/gi';
import {
    MdDirectionsBike,
    MdSpeed
} from 'react-icons/md';

interface VehicleType {
    id: string;
    label: string;
    icon: React.ReactNode;
    category: string;
    color: string;
}

const vehicleTypes: VehicleType[] = [
    { id: '1', label: 'Economy', icon: <GiCarSeat className="text-6xl" />, category: 'economy', color: 'bg-blue-500/10 text-blue-500' },
    { id: '2', label: 'SUV', icon: <GiJeep className="text-6xl" />, category: 'suv', color: 'bg-emerald-500/10 text-emerald-500' },
    { id: '3', label: 'Luxury', icon: <GiDiamondRing className="text-6xl" />, category: 'luxury', color: 'bg-amber-500/10 text-amber-500' },
    { id: '4', label: 'Sport', icon: <GiRaceCar className="text-6xl" />, category: 'convertible', color: 'bg-red-500/10 text-red-500' },
    { id: '5', label: 'Vans', icon: <FaShuttleVan className="text-6xl" />, category: 'van', color: 'bg-purple-500/10 text-purple-500' },
    { id: '6', label: 'Bikes', icon: <GiFullMotorcycleHelmet className="text-6xl" />, category: 'motorcycle', color: 'bg-orange-500/10 text-orange-500' },
    { id: '7', label: 'Off-Road', icon: <GiMountainRoad className="text-6xl" />, category: 'suv', color: 'bg-brown-500/10 text-amber-800' },
    { id: '8', label: 'Bicycles', icon: <MdDirectionsBike className="text-6xl" />, category: 'bicycle', color: 'bg-lime-500/10 text-lime-600' },
    { id: '9', label: 'Performance', icon: <MdSpeed className="text-6xl" />, category: 'luxury', color: 'bg-cyan-500/10 text-cyan-500' },
];

// Double items for a longer track
const extendedVehicleTypes = [...vehicleTypes, ...vehicleTypes, ...vehicleTypes];

interface VehicleTypeCarouselProps {
    onSelectCategory: (category: string) => void;
}

const VehicleTypeCarousel: React.FC<VehicleTypeCarouselProps> = ({ onSelectCategory }) => {
    const [isPaused, setIsPaused] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logic
    useEffect(() => {
        let scrollInterval: any;

        if (!isPaused) {
            scrollInterval = setInterval(() => {
                if (scrollContainerRef.current) {
                    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;

                    if (scrollLeft + clientWidth >= scrollWidth - 5) {
                        scrollContainerRef.current.scrollTo({ left: 0, behavior: 'auto' });
                    } else {
                        scrollContainerRef.current.scrollBy({ left: 0.8, behavior: 'auto' });
                    }
                }
            }, 30);
        }

        return () => clearInterval(scrollInterval);
    }, [isPaused]);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = 300;
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    return (
        <section
            className="py-16 bg-background overflow-hidden relative"
        >
            <div className="max-w-7xl mx-auto px-6 mb-10 text-center">
                <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3 tracking-tight">Our Specialized Fleet</h2>
                <p className="text-lg text-muted-foreground font-medium">Detailed categories for every journey</p>
            </div>

            {/* Carousel Container */}
            <div className="relative">
                {/* Vignette Overlays */}
                <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-background via-background/40 to-transparent z-10 pointer-events-none" />
                <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-background via-background/40 to-transparent z-10 pointer-events-none" />

                {/* Navigation Arrows */}
                <button
                    onClick={(e) => { e.stopPropagation(); scroll('left'); }}
                    className="absolute left-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-card/90 backdrop-blur-xl border border-border rounded-full flex items-center justify-center text-foreground shadow-lg transition-all duration-500 hover:bg-primary hover:text-white transform hover:scale-110 active:scale-90"
                    aria-label="Previous"
                >
                    <FaChevronLeft className="text-sm" />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); scroll('right'); }}
                    className="absolute right-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-card/90 backdrop-blur-xl border border-border rounded-full flex items-center justify-center text-foreground shadow-lg transition-all duration-500 hover:bg-primary hover:text-white transform hover:scale-110 active:scale-90"
                    aria-label="Next"
                >
                    <FaChevronRight className="text-sm" />
                </button>

                {/* Dense Scrollable Track */}
                <div
                    ref={scrollContainerRef}
                    className="flex overflow-x-auto gap-6 py-6 px-16 no-scrollbar cursor-grab active:cursor-grabbing select-none scroll-smooth"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {extendedVehicleTypes.map((type, idx) => (
                        <div
                            key={`${type.id}-${idx}`}
                            onClick={() => onSelectCategory(type.category)}
                            onMouseEnter={() => setIsPaused(true)}
                            onMouseLeave={() => setIsPaused(false)}
                            className="group flex flex-col items-center justify-center min-w-[170px] h-40 bg-card/40 backdrop-blur-sm rounded-3xl transition-all duration-500 cursor-pointer p-4"
                        >
                            <div className={`mb-3 p-4 rounded-2xl ${type.color} group-hover:scale-125 group-hover:rotate-6 transition-all duration-500 transform shadow-inner`}>
                                {type.icon}
                            </div>
                            <span className="text-base font-black text-foreground group-hover:text-primary transition-colors tracking-tighter">
                                {type.label}
                            </span>
                            <div className="mt-2 w-0 group-hover:w-8 h-1 bg-gradient-to-r from-primary to-purple-500 rounded-full transition-all duration-500" />
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
        </section>
    );
};

export default VehicleTypeCarousel;
