// components/MobileCarousel.jsx
import { useState, useRef, useEffect, useCallback } from 'react';
import './MobileCarousel.css'

export default function MobileCarousel({
    children,
    className = '',
    showDots = true,
    showNav = true,
    autoPlay = false,
    autoPlayDelay = 3000
}) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isMobile, setIsMobile] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const scrollRef = useRef(null);
    const touchStartX = useRef(0);
    const touchEndX = useRef(0);
    const autoPlayRef = useRef(null);
    const navigationTimeoutRef = useRef(null);

    const childrenArray = Array.isArray(children) ? children : [children];
    const totalCards = childrenArray.length;

    // Check if mobile
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Scroll to specific index with navigation lock
    const scrollToIndex = useCallback((index) => {
        if (!scrollRef.current || !isMobile) return;

        const cardWidth = scrollRef.current.offsetWidth;
        scrollRef.current.scrollTo({
            left: cardWidth * index,
            behavior: 'smooth'
        });
    }, [isMobile]);

    // Auto-scroll to current index when it changes
    useEffect(() => {
        if (currentIndex >= 0 && currentIndex < totalCards) {
            scrollToIndex(currentIndex);
        }
    }, [currentIndex, scrollToIndex, totalCards]);

    // Clean up timeouts on unmount
    useEffect(() => {
        return () => {
            if (navigationTimeoutRef.current) {
                clearTimeout(navigationTimeoutRef.current);
            }
            if (autoPlayRef.current) {
                clearInterval(autoPlayRef.current);
            }
        };
    }, []);

    // Auto-play functionality
    useEffect(() => {
        if (!autoPlay || !isMobile || totalCards <= 1) {
            if (autoPlayRef.current) {
                clearInterval(autoPlayRef.current);
                autoPlayRef.current = null;
            }
            return;
        }

        // Clear existing interval
        if (autoPlayRef.current) {
            clearInterval(autoPlayRef.current);
        }

        // Set new interval
        autoPlayRef.current = setInterval(() => {
            if (!isNavigating) {
                setCurrentIndex(prev => (prev === totalCards - 1 ? 0 : prev + 1));
            }
        }, autoPlayDelay);

        return () => {
            if (autoPlayRef.current) {
                clearInterval(autoPlayRef.current);
                autoPlayRef.current = null;
            }
        };
    }, [autoPlay, autoPlayDelay, isMobile, totalCards, isNavigating]);

    // Throttled navigation function
    const navigateCarousel = useCallback((direction) => {
        // Prevent navigation if already navigating
        if (isNavigating) return;

        // Set navigation lock
        setIsNavigating(true);

        // Stop auto-play when user manually navigates
        if (autoPlayRef.current) {
            clearInterval(autoPlayRef.current);
            autoPlayRef.current = null;
        }

        // Update index
        setCurrentIndex(prev => {
            if (direction === 'prev') {
                return prev === 0 ? totalCards - 1 : prev - 1;
            } else {
                return prev === totalCards - 1 ? 0 : prev + 1;
            }
        });

        // Clear any existing timeout
        if (navigationTimeoutRef.current) {
            clearTimeout(navigationTimeoutRef.current);
        }

        // Release navigation lock after animation completes
        navigationTimeoutRef.current = setTimeout(() => {
            setIsNavigating(false);

            // Restart auto-play if enabled
            if (autoPlay && isMobile && !autoPlayRef.current) {
                autoPlayRef.current = setInterval(() => {
                    setCurrentIndex(prev => (prev === totalCards - 1 ? 0 : prev + 1));
                }, autoPlayDelay);
            }
        }, 600); // Match this with CSS transition duration
    }, [isNavigating, totalCards, autoPlay, autoPlayDelay, isMobile]);

    // Throttled slide selection
    const goToSlide = useCallback((index) => {
        // Prevent navigation if already navigating
        if (isNavigating || index === currentIndex) return;

        // Set navigation lock
        setIsNavigating(true);

        // Stop auto-play when user manually selects
        if (autoPlayRef.current) {
            clearInterval(autoPlayRef.current);
            autoPlayRef.current = null;
        }

        setCurrentIndex(index);

        // Clear any existing timeout
        if (navigationTimeoutRef.current) {
            clearTimeout(navigationTimeoutRef.current);
        }

        // Release navigation lock after animation
        navigationTimeoutRef.current = setTimeout(() => {
            setIsNavigating(false);

            // Restart auto-play if enabled
            if (autoPlay && isMobile && !autoPlayRef.current) {
                autoPlayRef.current = setInterval(() => {
                    setCurrentIndex(prev => (prev === totalCards - 1 ? 0 : prev + 1));
                }, autoPlayDelay);
            }
        }, 600);
    }, [isNavigating, currentIndex, totalCards, autoPlay, autoPlayDelay, isMobile]);

    // Handle manual scroll (for touch/swipe) - debounced
    const handleScroll = useCallback((e) => {
        if (!isMobile || isNavigating) return;

        const container = e.target;
        const scrollLeft = container.scrollLeft;
        const cardWidth = container.offsetWidth;
        const newIndex = Math.round(scrollLeft / cardWidth);

        if (newIndex !== currentIndex && newIndex >= 0 && newIndex < totalCards) {
            setCurrentIndex(newIndex);
        }
    }, [isMobile, isNavigating, currentIndex, totalCards]);

    // Touch handlers for swipe
    const handleTouchStart = useCallback((e) => {
        touchStartX.current = e.touches[0].clientX;
        // Stop auto-play on touch
        if (autoPlayRef.current) {
            clearInterval(autoPlayRef.current);
            autoPlayRef.current = null;
        }
    }, []);

    const handleTouchMove = useCallback((e) => {
        touchEndX.current = e.touches[0].clientX;
    }, []);

    const handleTouchEnd = useCallback(() => {
        const diff = touchStartX.current - touchEndX.current;
        const threshold = 50; // Minimum swipe distance

        if (Math.abs(diff) > threshold && !isNavigating) {
            if (diff > 0) {
                // Swiped left
                navigateCarousel('next');
            } else {
                // Swiped right
                navigateCarousel('prev');
            }
        }

        // Restart auto-play after touch
        if (autoPlay && isMobile && !autoPlayRef.current && !isNavigating) {
            setTimeout(() => {
                if (!autoPlayRef.current) {
                    autoPlayRef.current = setInterval(() => {
                        setCurrentIndex(prev => (prev === totalCards - 1 ? 0 : prev + 1));
                    }, autoPlayDelay);
                }
            }, autoPlayDelay * 2);
        }
    }, [navigateCarousel, isNavigating, autoPlay, isMobile, autoPlayDelay, totalCards]);

    // Return normal grid layout on desktop
    if (!isMobile) {
        return (
            <div className={className}>
                {children}
            </div>
        );
    }

    // Mobile carousel layout
    return (
        <div className="mobile-carousel-container">
            <div className="mobile-carousel-wrapper">
                {/* Navigation Button - Previous */}
                {showNav && totalCards > 1 && (
                    <button
                        className={`mobile-carousel-nav prev ${isNavigating ? 'disabled' : ''}`}
                        onClick={() => navigateCarousel('prev')}
                        disabled={isNavigating}
                        aria-label="Previous card"
                        type="button"
                    >
                        ‹
                    </button>
                )}

                {/* Carousel Track */}
                <div
                    className="mobile-carousel-track"
                    ref={scrollRef}
                    onScroll={handleScroll}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    {childrenArray.map((child, index) => (
                        <div key={index} className="mobile-carousel-slide">
                            {child}
                        </div>
                    ))}
                </div>

                {/* Navigation Button - Next */}
                {showNav && totalCards > 1 && (
                    <button
                        className={`mobile-carousel-nav next ${isNavigating ? 'disabled' : ''}`}
                        onClick={() => navigateCarousel('next')}
                        disabled={isNavigating}
                        aria-label="Next card"
                        type="button"
                    >
                        ›
                    </button>
                )}
            </div>

            {/* Dots Indicator */}
            {showDots && totalCards > 1 && (
                <div className="mobile-carousel-dots">
                    {childrenArray.map((_, index) => (
                        <button
                            key={index}
                            className={`mobile-carousel-dot ${index === currentIndex ? 'active' : ''} ${isNavigating ? 'disabled' : ''}`}
                            onClick={() => goToSlide(index)}
                            disabled={isNavigating}
                            aria-label={`Go to slide ${index + 1}`}
                            type="button"
                        />
                    ))}
                </div>
            )}
        </div>
    );
}