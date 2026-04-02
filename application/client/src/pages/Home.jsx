// pages/Home.jsx
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { uploadFile } from "../api.js";
import MobileCarousel from "../components/MobileCarousel.jsx";
import "./Home.css";
import "../components/MobileCarousel.css"; // Import MobileCarousel.css for carousel styles

const SAMPLE_FILE_PATH = '/data/sample_data.csv';
const SAMPLE_FILE_NAME = 'sample_data.csv';
const VALID_FILE_TYPES = ['.csv', '.xlsx', '.xls'];

// Static data
const STATS_DATA = [
    {
        icon: "📈",
        label: "Performance Trends",
        gradient: "linear-gradient(135deg, rgba(56, 189, 248, 0.1), rgba(14, 165, 233, 0.2))",
        borderColor: "rgba(14, 165, 233, 0.2)",
        shadowColor: "rgba(14, 165, 233, 0.15)"
    },
    {
        icon: "👥",
        label: "Player Analytics",
        gradient: "linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(139, 92, 246, 0.2))",
        borderColor: "rgba(139, 92, 246, 0.2)",
        shadowColor: "rgba(139, 92, 246, 0.15)"
    },
    {
        icon: "🎯",
        label: "Win Predictors",
        gradient: "linear-gradient(135deg, rgba(251, 146, 60, 0.1), rgba(251, 113, 133, 0.2))",
        borderColor: "rgba(251, 113, 133, 0.2)",
        shadowColor: "rgba(251, 113, 133, 0.15)"
    },
    {
        icon: "💡",
        label: "AI Insights",
        gradient: "linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.2))",
        borderColor: "rgba(16, 185, 129, 0.2)",
        shadowColor: "rgba(16, 185, 129, 0.15)"
    }
];

const FEATURES_DATA = [
    {
        title: "Temporal Analysis",
        description: "Track performance evolution over time with weekly and monthly breakdowns."
    },
    {
        title: "Player Comparison",
        description: "Compare individual player statistics and identify team strengths."
    },
    {
        title: "Smart Recommendations",
        description: "Get AI-powered coaching suggestions based on performance patterns."
    }
];

export default function Home({ setToken, setSummary, setLoading }) {
    const navigate = useNavigate();
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    // Animation on mount
    useEffect(() => {
        const elements = document.querySelectorAll('.scroll-reveal');
        elements.forEach((el, index) => {
            setTimeout(() => {
                el.classList.add('revealed');
            }, index * 100);
        });
    }, []);

    // File handling
    const handleFileUpload = async (file) => {
        const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        if (!VALID_FILE_TYPES.includes(ext)) {
            alert('Please upload a valid CSV or Excel file');
            return;
        }

        setLoading(true);
        try {
            const res = await uploadFile(file);
            const token = res.run_id ?? res.token;
            setToken(token);
            setSummary(res.summary);
            // Also pass data through navigation to guarantee it's available
            navigate("/analysis", {
                state: {
                    token: token,
                    summary: res.summary
                }
            });

            setTimeout(() => setLoading(false), 500);
        } catch (err) {
            console.error('Upload failed:', err);
            setLoading(false);
            alert("Upload or analysis failed. Please try again.");
        }
    };

    const handleUseSampleData = async () => {
        try {
            const response = await fetch(SAMPLE_FILE_PATH);
            if (!response.ok) throw new Error('Sample file not found');
            const blob = await response.blob();
            const file = new File([blob], SAMPLE_FILE_NAME, { type: 'text/csv' });
            await handleFileUpload(file);
        } catch (err) {
            console.error('Failed to load sample data:', err);
            alert('Failed to load sample data.');
        }
    };

    const handleDownloadSample = () => {
        const link = document.createElement('a');
        link.href = SAMPLE_FILE_PATH;
        link.download = SAMPLE_FILE_NAME;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Drag handlers
    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    };

    return (
        <div className="container">
            {/* Hero Section */}
            <section className="hero">
                <h1 className="hero-title">Performance Analytics Reimagined</h1>
                <p className="hero-subtitle">
                    Transform your volleyball data into actionable insights with our elegant analytics platform.
                </p>

                {/* Upload Zone */}
                <div
                    className={`upload-zone ${isDragging ? 'dragging' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyPress={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            fileInputRef.current?.click();
                        }
                    }}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file);
                        }}
                        style={{ display: 'none' }}
                    />
                    <div className="upload-icon">📊</div>
                    <h3 className="upload-title">Drop Your Data Here</h3>
                    <p className="upload-subtitle">Support for CSV, XLSX, and XLS files</p>
                    <p className="upload-subtitle">Input data should be structured like the sample csv!</p>
                    <p className="upload-hint">or click to browse</p>
                </div>

                {/* Sample Data Options */}
                <div className="sample-data-container">
                    <div className="sample-divider">
                        <span>OR</span>
                    </div>
                    <div className="sample-buttons">
                        <button
                            className="sample-btn sample-btn-primary"
                            onClick={handleUseSampleData}
                        >
                            📄 Use Sample Data
                        </button>
                        <button
                            className="sample-btn sample-btn-outline"
                            onClick={handleDownloadSample}
                        >
                            ⬇️ Download Sample CSV
                        </button>
                    </div>
                </div>
            </section>

            {/* What You'll Discover - Grid on Desktop, Carousel on Mobile */}
            <section className="stats-section scroll-reveal">
                <h2 className="section-title">What You'll Discover</h2>
                <MobileCarousel className="stats-grid" showDots={true} showNav={true}>
                    {STATS_DATA.map((stat, index) => (
                        <div key={index} className="stat-card-home">
                            <div
                                className="stat-icon"
                                style={{
                                    background: stat.gradient,
                                    border: `2px solid ${stat.borderColor}`,
                                    boxShadow: `0 8px 24px ${stat.shadowColor}`
                                }}
                            >
                                {stat.icon}
                            </div>
                            <div className="stat-label">{stat.label}</div>
                        </div>
                    ))}
                </MobileCarousel>
            </section>

            {/* Advanced Analytics Features - Grid on Desktop, Carousel on Mobile */}
            <section className="features-section scroll-reveal">
                <h2 className="section-title">Advanced Analytics Features</h2>
                <MobileCarousel className="features-grid" showDots={true} showNav={true}>
                    {FEATURES_DATA.map((feature, index) => (
                        <div key={index} className="feature-card-home">
                            <h3>{feature.title}</h3>
                            <p>{feature.description}</p>
                        </div>
                    ))}
                </MobileCarousel>
            </section>

            {/* Call to Action */}
            <section className="cta-section scroll-reveal">
                <h2>Ready to Transform Your Game?</h2>
                <p>Upload your volleyball statistics now and discover insights that will elevate your team's performance.</p>
                <button
                    className="btn btn-primary"
                    onClick={() => fileInputRef.current?.click()}
                >
                    Get Started Now
                </button>
            </section>
        </div>
    );
}