// components/AICommentary.jsx
import { useNavigate } from "react-router-dom";

export default function AICommentary({
    commentary,
    commentaryGenerated,
    loadingCommentary,
    selectedPlayer,
    plots,
    mode,
    onGenerateCommentary
}) {
    const navigate = useNavigate();

    if (!commentaryGenerated && !loadingCommentary) {
        return (
            <div style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                <h3 style={{
                    fontFamily: 'var(--font-display)',
                    marginBottom: 'var(--space-md)'
                }}>
                    Ready to Generate Insights
                </h3>
                <p style={{
                    color: 'var(--text-muted)',
                    marginBottom: 'var(--space-xl)',
                    maxWidth: '500px',
                    margin: '0 auto var(--space-xl)'
                }}>
                    Click below to generate AI-powered analysis of your {selectedPlayer ? `${selectedPlayer}'s` : 'team'} performance
                    based on {plots.length} visualizations in {mode} mode.
                </p>
                <button
                    className="btn btn-primary"
                    onClick={onGenerateCommentary}
                    style={{
                        padding: 'var(--space-md) var(--space-2xl)',
                        fontSize: 'var(--text-base)'
                    }}
                >
                    <span style={{ marginRight: 'var(--space-sm)' }}>🤖</span>
                    Generate AI Commentary
                </button>
            </div>
        );
    }

    if (loadingCommentary) {
        return (
            <div style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                <div className="loading-spinner" style={{
                    width: '60px',
                    height: '60px',
                    margin: '0 auto var(--space-lg)'
                }}></div>
                <h3 style={{
                    fontFamily: 'var(--font-display)',
                    marginBottom: 'var(--space-sm)'
                }}>
                    Analyzing Your Data
                </h3>
                <p style={{ color: 'var(--text-muted)' }}>
                    Our AI is reviewing all {plots.length} visualizations to provide comprehensive insights...
                </p>
            </div>
        );
    }

    return (
        <>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--space-lg)'
            }}>
                <h3 style={{
                    fontFamily: 'var(--font-display)',
                    margin: 0
                }}>
                    {selectedPlayer ? `Analysis for ${selectedPlayer}` : 'Team Performance Analysis'}
                </h3>
                <button
                    className="btn btn-secondary"
                    onClick={onGenerateCommentary}
                    style={{
                        padding: 'var(--space-xs) var(--space-md)',
                        fontSize: 'var(--text-sm)'
                    }}
                >
                    🔄 Regenerate
                </button>
            </div>

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
                    No insights generated yet.
                </p>
            )}

            <div style={{
                display: 'flex',
                gap: 'var(--space-md)',
                marginTop: 'var(--space-xl)',
                borderTop: '1px solid var(--border-color)',
                paddingTop: 'var(--space-xl)'
            }}>
                <button className="btn btn-primary">
                    <span style={{ marginRight: 'var(--space-xs)' }}>📊</span>
                    View Detailed Report
                </button>
                <button className="btn btn-secondary">
                    <span style={{ marginRight: 'var(--space-xs)' }}>💾</span>
                    Export Analysis
                </button>
                <button
                    className="btn btn-secondary"
                    onClick={() => navigate('/')}
                >
                    <span style={{ marginRight: 'var(--space-xs)' }}>🔍</span>
                    New Analysis
                </button>
            </div>
        </>
    );
}