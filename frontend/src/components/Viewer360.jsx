import { useState, useEffect, useRef } from 'react';

const Viewer360 = ({ images360 }) => {
    const [currentFrame, setCurrentFrame] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [autoRotate, setAutoRotate] = useState(false);
    const containerRef = useRef(null);

    // Auto-rotate effect
    useEffect(() => {
        if (!autoRotate || images360.length === 0) return;

        const interval = setInterval(() => {
            setCurrentFrame(prev => (prev + 1) % images360.length);
        }, 100); // Rotate every 100ms

        return () => clearInterval(interval);
    }, [autoRotate, images360.length]);

    const handleMouseDown = (e) => {
        setIsDragging(true);
        setStartX(e.clientX);
        setAutoRotate(false);
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;

        const diff = e.clientX - startX;
        const sensitivity = 5; // Pixels needed to move to next frame

        if (Math.abs(diff) > sensitivity) {
            const direction = diff > 0 ? 1 : -1;
            setCurrentFrame((prev) => {
                const newFrame = prev + direction;
                return (newFrame + images360.length) % images360.length;
            });
            setStartX(e.clientX);
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleTouchStart = (e) => {
        setIsDragging(true);
        setStartX(e.touches[0].clientX);
        setAutoRotate(false);
    };

    const handleTouchMove = (e) => {
        if (!isDragging) return;

        const diff = e.touches[0].clientX - startX;
        const sensitivity = 5;

        if (Math.abs(diff) > sensitivity) {
            const direction = diff > 0 ? 1 : -1;
            setCurrentFrame((prev) => {
                const newFrame = prev + direction;
                return (newFrame + images360.length) % images360.length;
            });
            setStartX(e.touches[0].clientX);
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
    };

    if (!images360 || images360.length === 0) {
        return (
            <div className="bg-gray-100 rounded-lg p-12 text-center">
                <div className="text-6xl mb-4">🔄</div>
                <p className="text-gray-600">No 360° images available</p>
                <p className="text-sm text-gray-500 mt-2">
                    Upload 8-36 images in sequence to create a 360° view
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4">
                <h3 className="text-xl font-bold flex items-center">
                    🔄 360° Interactive View
                </h3>
                <p className="text-sm text-blue-100 mt-1">
                    Drag left or right to rotate • {images360.length} frames
                </p>
            </div>

            {/* 360 Viewer */}
            <div
                ref={containerRef}
                className={`relative bg-gray-900 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <img
                    src={images360[currentFrame]?.image_url}
                    alt={`360 view frame ${currentFrame + 1}`}
                    className="w-full h-96 object-contain select-none"
                    draggable={false}
                />

                {/* Frame Indicator */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full flex items-center space-x-2">
                    <span className="text-sm font-semibold">
                        Frame {currentFrame + 1} / {images360.length}
                    </span>
                </div>

                {/* Rotation Hint */}
                {!isDragging && currentFrame === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-black/50 text-white px-6 py-3 rounded-lg animate-pulse">
                            <p className="text-lg font-semibold">👆 Drag to rotate</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <div className="flex items-center justify-between">
                    {/* Progress Bar */}
                    <div className="flex-1 mr-4">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-200"
                                style={{ width: `${((currentFrame + 1) / images360.length) * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Auto-rotate Toggle */}
                    <button
                        onClick={() => setAutoRotate(!autoRotate)}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all ${autoRotate
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                    >
                        {autoRotate ? '⏸️ Pause' : '▶️ Auto-Rotate'}
                    </button>
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center justify-center space-x-4 mt-4">
                    <button
                        onClick={() => setCurrentFrame(prev => (prev - 1 + images360.length) % images360.length)}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        ← Previous
                    </button>
                    <button
                        onClick={() => setCurrentFrame(0)}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Reset
                    </button>
                    <button
                        onClick={() => setCurrentFrame(prev => (prev + 1) % images360.length)}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Next →
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Viewer360;
