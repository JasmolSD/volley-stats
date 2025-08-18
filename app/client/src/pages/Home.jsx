// pages/Home.jsx
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { uploadFile } from "../api.js";

export default function Home({ setToken, setSummary, setLoading }) {
    const navigate = useNavigate();
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);
    const uploadZoneRef = useRef(null);

    useEffect(() => {
        // Trigger animations on mount
        const elements = document.querySelectorAll('.fade-in, .scroll-reveal');
        elements.forEach((el, index) => {
            setTimeout(() => {
                el.classList.add('revealed');
            }, index * 100);
        });
    }, []);

    async function handleFileUpload(file) {
        // Validate file type
        const validTypes = ['.csv', '.xlsx', '.xls'];
        const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

        if (!validTypes.includes(fileExtension)) {
            alert('Please upload a valid CSV or Excel file');
            return;
        }

        setLoading(true);

        try {
            const res = await uploadFile(file);
            const token = res.run_id ?? res.token;
            setToken(token);
            setSummary(res.summary);

            // Add a small delay for smooth transition
            setTimeout(() => {
                setLoading(false);
                navigate("/results");
            }, 500);
        } catch (err) {
            console.error(err);
            setLoading(false);
            alert("Upload or analysis failed. Please try again with a valid CSV/XLSX file.");
        }
    }

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
                    ref={uploadZoneRef}
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
                    aria-label="Upload file zone"
                    style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        border: '2px dashed rgba(255, 255, 255, 0.3)',
                        boxShadow: '0 8px 32px rgba(14, 165, 233, 0.1)'
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
                    <p style={{
                        color: 'var(--text-muted)',
                        fontSize: 'var(--text-xs)',
                        marginTop: 'var(--space-sm)',
                        opacity: 0.7
                    }}>
                        or click to browse
                    </p>
                </div>
            </section>

            {/* Sample Stats Preview */}
            <section className="stats-section scroll-reveal">
                <h2 style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
                    What You'll Discover
                </h2>
                <div className="grid grid-cols-4">
                    <div className="stat-card">
                        <div style={{
                            width: '80px',
                            height: '80px',
                            margin: '0 auto var(--space-md)',
                            background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.1), rgba(14, 165, 233, 0.2))',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '2.5rem',
                            border: '2px solid rgba(14, 165, 233, 0.2)',
                            boxShadow: '0 8px 24px rgba(14, 165, 233, 0.15)'
                        }}>
                            📈
                        </div>
                        <div className="stat-label">Performance Trends</div>
                    </div>
                    <div className="stat-card">
                        <div style={{
                            width: '80px',
                            height: '80px',
                            margin: '0 auto var(--space-md)',
                            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(139, 92, 246, 0.2))',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '2.5rem',
                            border: '2px solid rgba(139, 92, 246, 0.2)',
                            boxShadow: '0 8px 24px rgba(139, 92, 246, 0.15)'
                        }}>
                            👥
                        </div>
                        <div className="stat-label">Player Analytics</div>
                    </div>
                    <div className="stat-card">
                        <div style={{
                            width: '80px',
                            height: '80px',
                            margin: '0 auto var(--space-md)',
                            background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.1), rgba(251, 113, 133, 0.2))',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '2.5rem',
                            border: '2px solid rgba(251, 113, 133, 0.2)',
                            boxShadow: '0 8px 24px rgba(251, 113, 133, 0.15)'
                        }}>
                            🎯
                        </div>
                        <div className="stat-label">Win Predictors</div>
                    </div>
                    <div className="stat-card">
                        <div style={{
                            width: '80px',
                            height: '80px',
                            margin: '0 auto var(--space-md)',
                            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.2))',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '2.5rem',
                            border: '2px solid rgba(16, 185, 129, 0.2)',
                            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.15)'
                        }}>
                            💡
                        </div>
                        <div className="stat-label">AI Insights</div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="scroll-reveal" style={{ marginTop: 'var(--space-3xl)' }}>
                <h2 style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
                    Advanced Analytics Features
                </h2>
                <div className="grid grid-cols-3">
                    <div className="card">
                        <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-md)' }}>
                            Temporal Analysis
                        </h3>
                        <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                            Track performance evolution over time with weekly and monthly breakdowns.
                        </p>
                    </div>
                    <div className="card">
                        <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-md)' }}>
                            Player Comparison
                        </h3>
                        <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                            Compare individual player statistics and identify team strengths.
                        </p>
                    </div>
                    <div className="card">
                        <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-md)' }}>
                            Smart Recommendations
                        </h3>
                        <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                            Get AI-powered coaching suggestions based on performance patterns.
                        </p>
                    </div>
                </div>
            </section>

            {/* Call to Action */}
            <section className="scroll-reveal" style={{
                textAlign: 'center',
                marginTop: 'var(--space-3xl)',
                padding: 'var(--space-3xl) 0'
            }}>
                <h2 style={{ marginBottom: 'var(--space-lg)' }}>
                    Ready to Transform Your Game?
                </h2>
                <p style={{
                    color: 'var(--text-muted)',
                    maxWidth: '600px',
                    margin: '0 auto var(--space-xl)'
                }}>
                    Upload your volleyball statistics now and discover insights that will elevate your team's performance to the next level.
                </p>
                <button
                    className="btn btn-primary"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ fontSize: 'var(--text-base)' }}
                >
                    Get Started Now
                </button>
            </section>
        </div>
    );
}