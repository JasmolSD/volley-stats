// pages/Results.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPlayers, getPlot, getCommentary, getSummary } from "../api.js";

// Import components
import PlotModal from "../components/PlotModal.jsx";
import ModeToggle from "../components/ModeToggle.jsx";
import PlayerDropdown from "../components/PlayerDropdown.jsx";
import PlayerPerformance from "../components/PlayerPerformance.jsx";
import PlotCard from "../components/PlotCard.jsx";
import DatasetOverview from "../components/DatasetOverview.jsx";
import TeamStatistics from "../components/TeamStatistics.jsx";
import AICommentary from "../components/AICommentary.jsx";

export default function Results({ token, summary, setLoading }) {
    const navigate = useNavigate();
    const [players, setPlayers] = useState([]);
    const [selectedPlayer, setSelectedPlayer] = useState("");
    const [mode, setMode] = useState("cumulative");
    const [plots, setPlots] = useState([]);
    const [playerSummary, setPlayerSummary] = useState(null);
    const [loadingPlots, setLoadingPlots] = useState(false);
    const [loadingPlayerSummary, setLoadingPlayerSummary] = useState(false);
    const [activePlot, setActivePlot] = useState(null);
    const [commentary, setCommentary] = useState("");
    const [loadingCommentary, setLoadingCommentary] = useState(false);
    const [commentaryGenerated, setCommentaryGenerated] = useState(false);

    // NEW: State for model information
    const [modelsUsed, setModelsUsed] = useState(null);
    const [commentarySummary, setCommentarySummary] = useState(null);

    useEffect(() => {
        if (!token) {
            navigate('/');
            return;
        }

        const loadPlayers = async () => {
            try {
                const res = await getPlayers(token);
                setPlayers(res.players || []);
            } catch (err) {
                console.error('Failed to load players:', err);
            }
        };

        loadPlayers();
    }, [token, navigate]);

    // Load player summary when player is selected
    useEffect(() => {
        if (!token || !selectedPlayer) {
            setPlayerSummary(null);
            return;
        }

        const loadPlayerSummary = async () => {
            setLoadingPlayerSummary(true);
            try {
                const res = await getSummary(token, selectedPlayer, mode);
                console.log('✅ Player summary loaded:', res);
                setPlayerSummary(res);
            } catch (err) {
                console.error('Failed to load player summary:', err);
                setPlayerSummary(null);
            } finally {
                setLoadingPlayerSummary(false);
            }
        };

        loadPlayerSummary();
    }, [token, selectedPlayer, mode]);

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

        const loadPlots = async () => {
            setLoadingPlots(true);
            try {
                const plotPromises = plotTypes.map(async (plotType) => {
                    try {
                        console.log(`Fetching plot: ${plotType.key} for player: ${selectedPlayer || 'all'} in ${mode} mode`);
                        const res = await getPlot(token, plotType.key, selectedPlayer || undefined, mode);

                        let imageData = res.image;

                        if (imageData && imageData.startsWith('data:image')) {
                            return {
                                type: plotType.key,
                                title: plotType.label,
                                image: imageData
                            };
                        }

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
                setPlots([]);
            } finally {
                setLoadingPlots(false);
            }
        };

        loadPlots();
    }, [token, selectedPlayer, mode, plotTypes]);

    // UPDATED: Generate commentary and capture model information
    const handleGenerateCommentary = async () => {
        if (!token) return;

        setLoadingCommentary(true);
        try {
            const res = await getCommentary(token, selectedPlayer || undefined, mode);

            // Extract commentary text
            setCommentary(res.commentary || "");

            // NEW: Extract model information
            if (res.models_used) {
                setModelsUsed(res.models_used);
                console.log('Models used:', res.models_used);
            } else if (res.text_model && res.vision_model) {
                // Fallback to direct model fields
                setModelsUsed({
                    text: res.text_model,
                    vision: res.vision_model
                });
            }

            // NEW: Store enhanced summary if available
            if (res.summary) {
                setCommentarySummary(res.summary);
                console.log('Commentary summary with stats:', res.summary);
            }

            setCommentaryGenerated(true);
        } catch (err) {
            console.error('Failed to load commentary:', err);
            setCommentary("Failed to generate commentary. Please try again.");
            setModelsUsed(null);
        } finally {
            setLoadingCommentary(false);
        }
    };

    // Reset commentary when player or mode changes
    useEffect(() => {
        setCommentary("");
        setCommentaryGenerated(false);
        setModelsUsed(null);
        setCommentarySummary(null);
    }, [selectedPlayer, mode]);

    // Initialize scroll animations
    useEffect(() => {
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

            {/* Dataset Overview */}
            {summary && (
                <section className="stats-section scroll-reveal">
                    <h2 style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
                        Dataset Overview
                    </h2>
                    <DatasetOverview summary={summary} />
                </section>
            )}

            {/* Team Statistics */}
            {summary && (
                <section className="stats-section scroll-reveal" style={{ marginTop: 'var(--space-3xl)' }}>
                    <h2 style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
                        Team Statistics
                    </h2>
                    <TeamStatistics summary={summary} />
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

            {/* Player Performance Section */}
            {selectedPlayer && playerSummary && (
                <section
                    key={`player-section-${selectedPlayer}-${mode}`}
                    className="stats-section scroll-reveal revealed"
                    style={{
                        marginTop: 'var(--space-3xl)',
                        opacity: 1,
                        transform: 'translateY(0)'
                    }}
                >
                    <PlayerPerformance
                        key={`player-perf-${selectedPlayer}-${JSON.stringify(playerSummary)?.substring(0, 10)}`}
                        playerSummary={playerSummary}
                        teamSummary={summary}
                        playerName={selectedPlayer}
                        isLoading={loadingPlayerSummary}
                    />
                </section>
            )}

            {/* Plot Gallery */}
            <section className="scroll-reveal" style={{ marginTop: 'var(--space-3xl)' }}>
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

            {/* AI Commentary - ENHANCED WITH MODEL INFO */}
            <section className="scroll-reveal" style={{ marginTop: 'var(--space-3xl)' }}>
                <h2 style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
                    AI-Powered Insights
                </h2>
                <div className="card-no-hover" style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <AICommentary
                        commentary={commentary}
                        commentaryGenerated={commentaryGenerated}
                        loadingCommentary={loadingCommentary}
                        selectedPlayer={selectedPlayer}
                        plots={plots}
                        mode={mode}
                        onGenerateCommentary={handleGenerateCommentary}
                        modelsUsed={modelsUsed}  // NEW: Pass model info
                        commentarySummary={commentarySummary}  // NEW: Pass enhanced summary
                        availablePlayers={players}
                    />
                </div>
            </section>
        </div>
    );
}