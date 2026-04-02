// components/MobileCarousel.jsx
import { useState, useRef, useEffect, useCallback } from 'react';
import './MobileCarousel.css';

export default function MobileCarousel({
    children,
    className = '',
    showDots = true,
    showNav = true,
    autoPlay = false,
    autoPlayDelay = 3000,
    swipeThreshold = 50, // Minimum swipe distance in px
    swipeVelocityThreshold = 0.5 // Minimum swipe velocity
}) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isMobile, setIsMobile] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);

    const scrollRef = useRef(null);
    const touchStartRef = useRef({ x: 0, time: 0 });
    const touchEndRef = useRef({ x: 0, time: 0 });
    const autoPlayRef = useRef(null);
    const scrollLockRef = useRef(false);

    const childrenArray = Array.isArray(children) ? children : [children];
    const totalCards = childrenArray.length;

    // Check if mobile
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Scroll to specific index
    const scrollToIndex = useCallback((index, immediate = false) => {
        if (!scrollRef.current || !isMobile || scrollLockRef.current) return;

        const container = scrollRef.current;
        const cardWidth = container.offsetWidth;
        const targetScroll = cardWidth * index;

        scrollLockRef.current = true;
        setIsTransitioning(true);

        container.scrollTo({
            left: targetScroll,
            behavior: immediate ? 'auto' : 'smooth'
        });

        setTimeout(() => {
            scrollLockRef.current = false;
            setIsTransitioning(false);
        }, immediate ? 50 : 400);
    }, [isMobile]);

    // Update scroll when index changes
    useEffect(() => {
        scrollToIndex(currentIndex);
    }, [currentIndex, scrollToIndex]);

    // Set up non-passive touch event listeners
    useEffect(() => {
        const track = scrollRef.current;
        if (!track || !isMobile) return;

        // Add non-passive touch move listener to allow preventDefault
        const handleTouchMoveNonPassive = (e) => {
            if (scrollLockRef.current) return;

            const touch = e.touches[0];
            const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
            const deltaY = Math.abs(touch.clientY - (touchStartRef.current.y || touch.clientY));

            // Store Y position if not already stored
            if (!touchStartRef.current.y) {
                touchStartRef.current.y = touch.clientY;
            }

            // If horizontal swipe is dominant, prevent vertical scrolling
            if (deltaX > deltaY && deltaX > 10) {
                e.preventDefault();
            }

            // Store current position for swipe end calculation
            touchEndRef.current = {
                x: touch.clientX,
                time: Date.now()
            };
        };

        // Add the event listener as non-passive
        track.addEventListener('touchmove', handleTouchMoveNonPassive, { passive: false });

        return () => {
            track.removeEventListener('touchmove', handleTouchMoveNonPassive);
        };
    }, [isMobile]);

    // Handle touch start
    const handleTouchStart = useCallback((e) => {
        if (scrollLockRef.current) return;

        touchStartRef.current = {
            x: e.touches[0].clientX,
            time: Date.now()
        };

        // Pause autoplay during touch
        if (autoPlayRef.current) {
            clearInterval(autoPlayRef.current);
            autoPlayRef.current = null;
        }
    }, []);

    // Handle touch end
    const handleTouchEnd = useCallback((e) => {
        if (scrollLockRef.current) return;

        const touchEnd = {
            x: e.changedTouches[0].clientX,
            time: Date.now()
        };

        const deltaX = touchStartRef.current.x - touchEnd.x;
        const deltaTime = touchEnd.time - touchStartRef.current.time;
        const velocity = Math.abs(deltaX) / deltaTime;

        // Determine if swipe is valid based on distance and velocity
        const isValidSwipe = Math.abs(deltaX) > swipeThreshold ||
            (Math.abs(deltaX) > 30 && velocity > swipeVelocityThreshold);

        if (isValidSwipe) {
            if (deltaX > 0) {
                // Swiped left - next
                setCurrentIndex(prev =>
                    prev === totalCards - 1 ? 0 : prev + 1
                );
            } else {
                // Swiped right - previous
                setCurrentIndex(prev =>
                    prev === 0 ? totalCards - 1 : prev - 1
                );
            }
        } else {
            // Snap back to current index if swipe wasn't strong enough
            scrollToIndex(currentIndex, true);
        }

        // Reset touch start Y
        delete touchStartRef.current.y;

        // Restart autoplay after delay
        if (autoPlay && !autoPlayRef.current) {
            setTimeout(() => {
                if (!autoPlayRef.current) {
                    autoPlayRef.current = setInterval(() => {
                        setCurrentIndex(prev =>
                            prev === totalCards - 1 ? 0 : prev + 1
                        );
                    }, autoPlayDelay);
                }
            }, autoPlayDelay);
        }
    }, [currentIndex, totalCards, swipeThreshold, swipeVelocityThreshold,
        scrollToIndex, autoPlay, autoPlayDelay]);

    // Navigation functions
    const navigate = useCallback((direction) => {
        if (scrollLockRef.current || isTransitioning) return;

        setCurrentIndex(prev => {
            if (direction === 'prev') {
                return prev === 0 ? totalCards - 1 : prev - 1;
            }
            return prev === totalCards - 1 ? 0 : prev + 1;
        });

        // Pause autoplay when manually navigating
        if (autoPlayRef.current) {
            clearInterval(autoPlayRef.current);
            autoPlayRef.current = null;
        }
    }, [totalCards, isTransitioning]);

    const goToSlide = useCallback((index) => {
        if (scrollLockRef.current || index === currentIndex || isTransitioning) return;
        setCurrentIndex(index);

        // Pause autoplay when manually selecting
        if (autoPlayRef.current) {
            clearInterval(autoPlayRef.current);
            autoPlayRef.current = null;
        }
    }, [currentIndex, isTransitioning]);

    // Auto-play
    useEffect(() => {
        if (!autoPlay || !isMobile || totalCards <= 1) {
            if (autoPlayRef.current) {
                clearInterval(autoPlayRef.current);
                autoPlayRef.current = null;
            }
            return;
        }

        autoPlayRef.current = setInterval(() => {
            if (!scrollLockRef.current && !isTransitioning) {
                setCurrentIndex(prev =>
                    prev === totalCards - 1 ? 0 : prev + 1
                );
            }
        }, autoPlayDelay);

        return () => {
            if (autoPlayRef.current) {
                clearInterval(autoPlayRef.current);
            }
        };
    }, [autoPlay, autoPlayDelay, isMobile, totalCards, isTransitioning]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (autoPlayRef.current) {
                clearInterval(autoPlayRef.current);
            }
        };
    }, []);

    // Desktop layout
    if (!isMobile) {
        return <div className={className}>{children}</div>;
    }

    // Mobile carousel
    return (
        <div className="mobile-carousel-container">
            <div className="mobile-carousel-wrapper">
                {/* Previous button with proper spacing */}
                {showNav && totalCards > 1 && (
                    <button
                        className="mobile-carousel-nav prev"
                        onClick={() => navigate('prev')}
                        disabled={isTransitioning}
                        aria-label="Previous"
                        type="button"
                    >
                        <span>‹</span>
                    </button>
                )}

                {/* Carousel track */}
                <div
                    className="mobile-carousel-track"
                    ref={scrollRef}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                >
                    {childrenArray.map((child, index) => (
                        <div
                            key={index}
                            className="mobile-carousel-slide"
                            data-index={index}
                        >
                            {child}
                        </div>
                    ))}
                </div>

                {/* Next button with proper spacing */}
                {showNav && totalCards > 1 && (
                    <button
                        className="mobile-carousel-nav next"
                        onClick={() => navigate('next')}
                        disabled={isTransitioning}
                        aria-label="Next"
                        type="button"
                    >
                        <span>›</span>
                    </button>
                )}
            </div>

            {/* Dots indicator */}
            {showDots && totalCards > 1 && (
                <div className="mobile-carousel-dots">
                    {childrenArray.map((_, index) => (
                        <button
                            key={index}
                            className={`mobile-carousel-dot ${index === currentIndex ? 'active' : ''
                                }`}
                            onClick={() => goToSlide(index)}
                            disabled={isTransitioning}
                            aria-label={`Go to slide ${index + 1}`}
                            type="button"
                        />
                    ))}
                </div>
            )}
        </div>
    );
}