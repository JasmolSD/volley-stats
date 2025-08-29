// App.jsx
import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Analysis from "./pages/Analysis.jsx";
import About from "./pages/About.jsx";
import ScrollToTop from "./components/ScrollToTop.jsx"; // Import ScrollToTop component

// Header Component
function Header() {
    const [scrolled, setScrolled] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleNavClick = (e, path) => {
        e.preventDefault();
        if (path === '#home') {
            navigate('/');
        } else if (path === '#analysis') {
            navigate('/analysis');
        } else if (path === '#about') {
            navigate('/about')
        }
    };

    return (
        <header id="header" className={scrolled ? 'scrolled' : ''}>
            <div className="header-inner">
                <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                    <div className="logo-icon">🏐</div>
                    <span>Volley Stats</span>
                </div>
                <nav>
                    <a href="#home" onClick={(e) => handleNavClick(e, '#home')}
                        className={location.pathname === '/' ? 'active' : ''}>
                        Home
                    </a>
                    <a href="#analysis" onClick={(e) => handleNavClick(e, '#analysis')}
                        className={location.pathname === '/analysis' ? 'active' : ''}>
                        Analysis
                    </a>
                    {/* <a href="#insights" onClick={(e) => handleNavClick(e, '#insights')}>
                        Insights
                    </a> */}
                    <a href="#about" onClick={(e) => handleNavClick(e, '#about')}
                        className={location.pathname === '/about' ? 'active' : ''}>
                        About
                    </a>
                </nav>
            </div>
        </header>
    );
}

// Footer Component
function Footer() {
    return (
        <footer>
            <div className="container">
                <p className="footer-text">
                    Made with love, care, and too much time! • Volley Stats © 2025
                </p>
            </div>
        </footer>
    );
}

// Loading Overlay Component
function LoadingOverlay({ show, message = "Analyzing Your Data", subtext = "Creating beautiful insights..." }) {
    if (!show) return null;

    return (
        <div className="loading-overlay" style={{ display: 'flex' }}>
            <div className="loading-content">
                <div className="loading-spinner"></div>
                <div className="loading-text">{message}</div>
                <div className="loading-subtext">{subtext}</div>
            </div>
        </div>
    );
}

// Main App Component
export default function App() {
    const [token, setToken] = useState(null);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Add mouse parallax effect
        const handleMouseMove = (e) => {
            const x = e.clientX / window.innerWidth;
            const y = e.clientY / window.innerHeight;
            document.body.style.setProperty('--mouse-x', `${x * 20 - 10}px`);
            document.body.style.setProperty('--mouse-y', `${y * 20 - 10}px`);
        };
        window.addEventListener('mousemove', handleMouseMove);

        // Initialize scroll animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                }
            });
        }, observerOptions);

        // Observe all scroll-reveal elements
        setTimeout(() => {
            document.querySelectorAll('.scroll-reveal').forEach(el => {
                observer.observe(el);
            });
        }, 100);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            observer.disconnect();
        };
    }, []);

    return (
        <BrowserRouter>
            {/* Add ScrollToTop component inside BrowserRouter but outside app-wrapper */}
            <ScrollToTop />

            <div className="app-wrapper">
                <Header />
                <LoadingOverlay show={loading} />

                <main>
                    <Routes>
                        <Route
                            path="/"
                            element={
                                <Home
                                    setToken={setToken}
                                    setSummary={setSummary}
                                    setLoading={setLoading}
                                />
                            }
                        />
                        <Route
                            path="/analysis"
                            element={
                                <Analysis
                                    token={token}
                                    summary={summary}
                                    setLoading={setLoading}
                                />
                            }
                        />
                        <Route
                            path="/about"
                            element={
                                <About
                                    token={token}
                                    summary={summary}
                                    setLoading={setLoading}
                                />
                            }
                        />
                    </Routes>
                </main>

                <Footer />
            </div>
        </BrowserRouter>
    );
}