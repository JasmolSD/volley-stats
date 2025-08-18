// pages/Results.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPlayers, getPlot, getCommentary, getSummary } from "../api.js";
import PlotModal from "../components/PlotModal.jsx";
import ModeToggle from "../components/ModeToggle.jsx";
import PlayerDropdown from "../components/PlayerDropdown.jsx";

// Plot Card Component
function PlotCard({ title, badge, imageSrc, onClick }) {
    const [imageError, setImageError] = useState(false);

    return (
        <div className="plot-card" onClick={onClick} style={{ cursor: 'zoom-in' }}>
            <div className="plot-header">
                <span className="plot-title">{title}</span>
                <span className="plot-badge">{badge}</span>
            </div>
            {!imageError && imageSrc ? (
                <img
                    src={imageSrc}
                    alt={title}
                    className="plot-image"
                    onError={(e) => {
                        console.error(`Failed to load image for ${title}`);
                        setImageError(true);
                    }}
                />
            ) : (
                <div style={{
                    width: '100%',
                    height: '300px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(255, 255, 255, 0.02)',
                    color: 'var(--text-muted)'
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: 'var(--space-sm)', opacity: 0.3 }}>
                            📈
                        </div>
                        <div style={{ fontSize: 'var(--text-sm)' }}>
                            Visualization Loading...
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Summary Stats Component
function SummaryStats({ summary }) {
    // Format date range to be more concise
    const formatDateRange = () => {
        if (!summary?.date_min || !summary?.date_max) return '—';

        const minDate = new Date(summary.date_min);
        const maxDate = new Date(summary.date_max);

        const formatDate = (date) => {
            const month = date.toLocaleDateString('en', { month: 'short' });
            const year = date.getFullYear();
            return `${month} ${year}`;
        };

        return `${formatDate(minDate)} - ${formatDate(maxDate)}`;
    };

    // Format performance metrics
    const formatPercentage = (value) => {
        if (value === null || value === undefined || isNaN(value)) return '—';
        return `${Math.round(value * 100)}%`;
    };

    const formatDecimal = (value, decimals = 1) => {
        if (value === null || value === undefined || isNaN(value)) return '—';
        return Number(value).toFixed(decimals);
    };

    const topStats = [
        {
            value: summary?.rows || '—',
            label: 'Total Records'
        },
        {
            value: summary?.players?.length || '—',
            label: 'Active Players'
        },
        {
            value: formatDateRange(),
            label: 'Date Range',
            isDateRange: true
        }
    ];

    const performanceStats = [
        {
            value: formatDecimal(summary?.avg_errors_per_set, 1),
            label: 'Avg Errors per Set'
        },
        {
            value: formatPercentage(summary?.atk_accuracy),
            label: 'Avg Hitting Rate'
        },
        {
            value: formatPercentage(summary?.rcv_accuracy),
            label: 'Avg Receiving Accuracy'
        },
        {
            value: formatPercentage(summary?.srv_accuracy),
            label: 'Avg Serving Accuracy'
        }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2xl)' }}>
            {/* Primary Stats */}
            <div className="grid grid-cols-3">
                {topStats.map((stat, index) => (
                    <div key={index} className="stat-card" style={{
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        minHeight: '120px'
                    }}>
                        <div className="stat-value" style={{
                            fontSize: stat.isDateRange ? 'var(--text-xl)' : 'var(--text-3xl)'
                        }}>
                            {stat.value}
                        </div>
                        <div className="stat-label">{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Performance Section Header */}
            <div style={{ textAlign: 'center', margin: 'var(--space-lg) 0 var(--space-md) 0' }}>
                <h3 style={{
                    fontSize: 'var(--text-lg)',
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    margin: '0 0 var(--space-xs) 0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                }}>
                    Performance Metrics
                </h3>
                <div style={{
                    width: '60px',
                    height: '2px',
                    background: 'linear-gradient(90deg, #ffffff, rgba(255, 255, 255, 0.7))',
                    margin: '0 auto',
                    borderRadius: '1px'
                }}></div>
            </div>

            {/* Performance Stats */}
            <div className="grid grid-cols-4">
                {performanceStats.map((stat, index) => (
                    <div
                        key={index}
                        className="stat-card"
                        style={{
                            background: 'rgba(255, 255, 255, 0.85)',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            minHeight: '120px',
                            boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.2) inset, 0 4px 12px rgba(0, 0, 0, 0.15)',
                            transition: 'all 0.2s ease',
                            cursor: 'default'
                        }}
                        onMouseEnter={(e) => {
                            const card = e.currentTarget;
                            card.style.borderColor = 'rgba(139, 69, 19, 0.8)';
                            card.style.boxShadow = '0 0 0 2px rgba(139, 69, 19, 0.6) inset, 0 4px 12px rgba(0, 0, 0, 0.15), 0 0 20px rgba(139, 69, 19, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                            const card = e.currentTarget;
                            card.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                            card.style.boxShadow = '0 0 0 1px rgba(255, 255, 255, 0.2) inset, 0 4px 12px rgba(0, 0, 0, 0.15)';
                        }}
                    >
                        <div className="stat-value" style={{
                            fontSize: 'var(--text-2xl)',
                            color: '#1f2937',
                            fontWeight: '700',
                            pointerEvents: 'none'
                        }}>
                            {stat.value}
                        </div>
                        <div className="stat-label" style={{
                            color: '#6b7280',
                            fontWeight: '500',
                            pointerEvents: 'none'
                        }}>
                            {stat.label}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function Results({ token, summary: initialSummary, setLoading }) {
    const navigate = useNavigate();
    const [players, setPlayers] = useState([]);
    const [selectedPlayer, setSelectedPlayer] = useState("");
    const [mode, setMode] = useState("cumulative");
    const [plots, setPlots] = useState([]);
    const [commentary, setCommentary] = useState("");
    const [summary, setSummary] = useState(initialSummary || null);
    const [loadingPlots, setLoadingPlots] = useState(false);
    const [loadingSummary, setLoadingSummary] = useState(false);
    const [activePlot, setActivePlot] = useState(null); // For modal

    useEffect(() => {
        if (!token) {
            navigate('/');
            return;
        }

        // Load players
        (async () => {
            try {
                const res = await getPlayers(token);
                setPlayers(res.players || []);
            } catch (err) {
                console.error('Failed to load players:', err);
            }
        })();
    }, [token, navigate]);

    // Determine which plot types to show
    const plotTypes = useMemo(() => {
        const base = [
            { key: "offense", label: "Offense Metrics" },
            { key: "service", label: "Service Analysis" },
            { key: "receive", label: "Receive Patterns" }
        ];
        const temporalOnly = [
            { key: "errors", label: "Errors Over Time" },
            { key: "atk_acc_over_time", label: "Attack Accuracy Trend" },
            { key: "avg_errors_over_time", label: "Average Errors Trend" }
        ];
        return mode === "temporal" ? [...base, ...temporalOnly] : base;
    }, [mode]);

    // Load plots when player or mode changes
    useEffect(() => {
        if (!token) return;

        (async () => {
            setLoadingPlots(true);
            try {
                const plotPromises = plotTypes.map(async (plotType) => {
                    try {
                        console.log(`Fetching plot: ${plotType.key} for player: ${selectedPlayer || 'all'} in ${mode} mode`);
                        const res = await getPlot(token, plotType.key, selectedPlayer || undefined, mode);

                        // Handle different response formats
                        let imageData = res.image;

                        // If image is already a data URL, use it as is
                        if (imageData && imageData.startsWith('data:image')) {
                            return {
                                type: plotType.key,
                                title: plotType.label,
                                image: imageData
                            };
                        }

                        // If it's base64 without the prefix, add it
                        if (imageData && !imageData.startsWith('data:')) {
                            return {
                                type: plotType.key,
                                title: plotType.label,
                                image: `data:image/png;base64,${imageData}`
                            };
                        }

                        console.warn(`No image data for plot: ${plotType.key}`);
                        return {
                            type: plotType.key,
                            title: plotType.label,
                            image: null
                        };
                    } catch (plotErr) {
                        console.error(`Error loading plot ${plotType.key}:`, plotErr);
                        return {
                            type: plotType.key,
                            title: plotType.label,
                            image: null
                        };
                    }
                });

                const plotResults = await Promise.all(plotPromises);
                const validPlots = plotResults.filter(p => p.image);

                console.log(`Successfully loaded ${validPlots.length} out of ${plotTypes.length} plots`);
                setPlots(validPlots);
            } catch (err) {
                console.error('Failed to load plots:', err);
                setPlots([]); // Set empty array on error
            } finally {
                setLoadingPlots(false);
            }
        })();
    }, [token, selectedPlayer, mode, plotTypes]);

    // Load summary when player or mode changes
    useEffect(() => {
        if (!token) return;

        (async () => {
            setLoadingSummary(true);
            try {
                const res = await getSummary(token, selectedPlayer || undefined, mode);
                setSummary(res);
            } catch (err) {
                console.error('Failed to load summary:', err);
                // Keep the previous summary on error
            } finally {
                setLoadingSummary(false);
            }
        })();
    }, [token, selectedPlayer, mode]);

    // Load commentary when player or mode changes
    useEffect(() => {
        if (!token) return;

        (async () => {
            try {
                const res = await getCommentary(token, selectedPlayer || undefined, mode);
                setCommentary(res.commentary || "");
            } catch (err) {
                console.error('Failed to load commentary:', err);
                setCommentary("");
            }
        })();
    }, [token, selectedPlayer, mode]);

    useEffect(() => {
        // Trigger scroll animations
        setTimeout(() => {
            document.querySelectorAll('.scroll-reveal').forEach(el => {
                el.classList.add('revealed');
            });
        }, 100);
    }, []);

    if (!token) {
        return (
            <div className="container">
                <div className="card" style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center' }}>
                    <h2>No Data Available</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-xl)' }}>
                        Please upload a file first to see your analysis.
                    </p>
                    <button className="btn btn-primary" onClick={() => navigate('/')}>
                        Upload Data
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container">
            {/* Page Header */}
            <section className="hero">
                <h1 className="hero-title">Your Performance Analysis</h1>
                <p className="hero-subtitle">
                    Explore comprehensive insights from your volleyball data
                </p>
            </section>

            {/* Stats Overview */}
            {summary && (
                <section className="stats-section scroll-reveal">
                    <h2 style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
                        {selectedPlayer ? `${selectedPlayer} Performance` : 'Dataset Overview'}
                    </h2>
                    {loadingSummary ? (
                        <div style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                            <div className="loading-spinner" style={{
                                width: '40px',
                                height: '40px',
                                margin: '0 auto var(--space-md)'
                            }}></div>
                            <p style={{ color: 'var(--text-muted)' }}>Updating summary...</p>
                        </div>
                    ) : (
                        <SummaryStats summary={summary} />
                    )}
                </section>
            )}

            {/* Controls Section */}
            <section style={{ textAlign: 'center', margin: 'var(--space-3xl) 0' }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'end',
                    gap: 'var(--space-xl)',
                    flexWrap: 'wrap'
                }}>
                    <div>
                        <label style={{
                            display: 'block',
                            marginBottom: 'var(--space-sm)',
                            color: 'var(--text-muted)',
                            fontSize: 'var(--text-sm)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            View Mode
                        </label>
                        <ModeToggle mode={mode} onChange={setMode} />
                    </div>

                    <div>
                        <label style={{
                            display: 'block',
                            marginBottom: 'var(--space-sm)',
                            color: 'var(--text-muted)',
                            fontSize: 'var(--text-sm)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            Player Filter
                        </label>
                        <PlayerDropdown
                            players={players}
                            value={selectedPlayer}
                            onChange={setSelectedPlayer}
                            token={token}
                        />
                    </div>
                </div>
            </section>

            {/* Plot Gallery */}
            <section className="scroll-reveal">
                <h2 style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
                    Performance Visualizations
                </h2>

                {loadingPlots ? (
                    <div style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
                        <div className="loading-spinner" style={{
                            width: '60px',
                            height: '60px',
                            margin: '0 auto var(--space-lg)'
                        }}></div>
                        <p style={{ color: 'var(--text-muted)' }}>Loading visualizations...</p>
                    </div>
                ) : plots.length > 0 ? (
                    <div className="plot-gallery">
                        {plots.map((plot, index) => (
                            <PlotCard
                                key={`${plot.type}-${index}`}
                                title={plot.title}
                                badge={mode === 'temporal' ? 'Temporal' : 'Cumulative'}
                                imageSrc={plot.image}
                                onClick={() => {
                                    setActivePlot({
                                        title: plot.title,
                                        src: plot.image
                                    });
                                }}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="card" style={{
                        textAlign: 'center',
                        maxWidth: '600px',
                        margin: '0 auto'
                    }}>
                        <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-lg)' }}>
                            No visualizations available yet.
                            {!selectedPlayer && players.length > 0 && (
                                <span> Try selecting a player to see detailed analytics.</span>
                            )}
                        </p>
                        {/* Fallback placeholder visualizations */}
                        <div className="grid grid-cols-3" style={{ marginTop: 'var(--space-xl)' }}>
                            {['Offense', 'Service', 'Receive'].map((type) => (
                                <div key={type} style={{
                                    padding: 'var(--space-md)',
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    borderRadius: 'var(--radius-lg)',
                                    border: '1px solid var(--border-color)'
                                }}>
                                    <div style={{
                                        fontSize: '2rem',
                                        marginBottom: 'var(--space-sm)',
                                        opacity: 0.5
                                    }}>
                                        📊
                                    </div>
                                    <div style={{
                                        fontSize: 'var(--text-sm)',
                                        color: 'var(--text-muted)'
                                    }}>
                                        {type}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </section>

            {/* Plot Modal */}
            {activePlot && (
                <PlotModal
                    title={activePlot.title}
                    src={activePlot.src}
                    onClose={() => setActivePlot(null)}
                />
            )}

            {/* AI Commentary */}
            <section className="scroll-reveal" style={{ marginTop: 'var(--space-3xl)' }}>
                <h2 style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
                    AI-Powered Insights
                </h2>
                <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <h3 style={{
                        fontFamily: 'var(--font-display)',
                        marginBottom: 'var(--space-md)'
                    }}>
                        {selectedPlayer ? `Analysis for ${selectedPlayer}` : 'Team Performance Analysis'}
                    </h3>
                    {commentary ? (
                        <div>
                            {commentary.split('\n\n').map((paragraph, i) => (
                                <p key={i} style={{
                                    lineHeight: 1.8,
                                    color: 'var(--text-secondary)',
                                    marginBottom: 'var(--space-md)'
                                }}>
                                    {paragraph}
                                </p>
                            ))}
                        </div>
                    ) : (
                        <p style={{
                            lineHeight: 1.8,
                            color: 'var(--text-muted)',
                            fontStyle: 'italic'
                        }}>
                            Generating personalized insights based on your data...
                        </p>
                    )}

                    <div style={{
                        display: 'flex',
                        gap: 'var(--space-md)',
                        marginTop: 'var(--space-xl)'
                    }}>
                        <button className="btn btn-primary">
                            View Detailed Report
                        </button>
                        <button className="btn btn-secondary">
                            Export Analysis
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={() => navigate('/')}
                        >
                            New Analysis
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}