// components/LLMCommentary.jsx
import { useEffect, useState } from "react";
import { getCommentary } from "../api";

export default function Commentary({ token, player }) {
    const [text, setText] = useState("");
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!token) return;

        let cancelled = false;

        (async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await getCommentary(token, player);
                if (!cancelled) {
                    setText(res.commentary || "");
                    setRequests(res.requests || []);
                }
            } catch (err) {
                if (!cancelled) {
                    setError("Failed to generate commentary");
                    console.error(err);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        })();

        return () => { cancelled = true; };
    }, [token, player]);

    if (loading) {
        return (
            <div className="commentary">
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '200px',
                    flexDirection: 'column',
                    gap: 'var(--space-md)'
                }}>
                    <div className="loading-spinner" style={{
                        width: '40px',
                        height: '40px'
                    }}></div>
                    <p style={{
                        color: 'var(--text-muted)',
                        fontSize: 'var(--text-sm)',
                        margin: 0
                    }}>
                        Generating personalized insights...
                    </p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="commentary" style={{
                background: 'rgba(255, 107, 107, 0.05)',
                borderColor: 'var(--coral)'
            }}>
                <p style={{
                    color: 'var(--coral)',
                    textAlign: 'center',
                    margin: 0
                }}>
                    {error}
                </p>
            </div>
        );
    }

    return (
        <div className="commentary">
            {/* Header with player context */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 'var(--space-lg)'
            }}>
                <h3 style={{
                    margin: 0
                }}>
                    {player ? `Analysis for ${player}` : 'Team Overview'}
                </h3>
                {player && (
                    <span className="chip" style={{
                        background: 'linear-gradient(135deg, var(--aurora-500), var(--aurora-600))',
                        color: 'white',
                        border: 'none'
                    }}>
                        Individual Focus
                    </span>
                )}
            </div>

            {/* Main Commentary Text */}
            {text ? (
                <div style={{
                    lineHeight: 1.8,
                    color: 'var(--text-secondary)'
                }}>
                    {text.split('\n\n').map((paragraph, i) => (
                        <p key={i} style={{
                            marginBottom: 'var(--space-md)',
                            animation: `fadeInUp 0.6s ${i * 0.1}s var(--ease-out-expo) both`
                        }}>
                            {paragraph}
                        </p>
                    ))}
                </div>
            ) : (
                <p style={{
                    color: 'var(--text-muted)',
                    fontStyle: 'italic',
                    textAlign: 'center'
                }}>
                    No analysis available yet. Try selecting a player or refreshing the data.
                </p>
            )}

            {/* Follow-up Suggestions */}
            {requests.length > 0 && (
                <div style={{
                    marginTop: 'var(--space-xl)',
                    paddingTop: 'var(--space-lg)',
                    borderTop: '1px solid var(--border-color)'
                }}>
                    <h4 style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: 'var(--text-sm)',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: 'var(--text-muted)',
                        marginBottom: 'var(--space-md)'
                    }}>
                        Recommended Deep Dives
                    </h4>
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 'var(--space-sm)'
                    }}>
                        {requests.map((req, i) => (
                            <button
                                key={i}
                                className="btn"
                                style={{
                                    fontSize: 'var(--text-xs)',
                                    padding: 'var(--space-xs) var(--space-md)'
                                }}
                            >
                                {typeof req === 'string' ? req : JSON.stringify(req)}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div style={{
                display: 'flex',
                gap: 'var(--space-md)',
                marginTop: 'var(--space-xl)',
                paddingTop: 'var(--space-lg)',
                borderTop: '1px solid var(--border-color)'
            }}>
                <button className="btn btn--primary">
                    🔄 Refresh Analysis
                </button>
                <button className="btn">
                    📋 Copy Insights
                </button>
            </div>
        </div>
    );
}

// Add fadeInUp animation to the page styles if not already present
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
if (!document.head.querySelector('style[data-fade-animation]')) {
    style.setAttribute('data-fade-animation', 'true');
    document.head.appendChild(style);
}