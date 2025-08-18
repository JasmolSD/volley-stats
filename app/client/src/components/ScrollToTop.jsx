// components/ScrollToTop.jsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
    const { pathname } = useLocation();

    useEffect(() => {
        // Scroll to top when the route changes
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: 'smooth' // Optional: adds smooth scrolling animation
        });
    }, [pathname]);

    return null; // This component doesn't render anything
}

// Alternative version without smooth scrolling (instant):
export function ScrollToTopInstant() {
    const { pathname } = useLocation();

    useEffect(() => {
        // Instant scroll to top when the route changes
        window.scrollTo(0, 0);
    }, [pathname]);

    return null;
}