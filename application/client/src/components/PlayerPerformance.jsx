// components/PlayerPerformance.jsx
import React, { useEffect } from 'react';

// Metric category icons (using simple SVG paths)
const MetricIcons = {
    errors: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            {/* X symbol for errors */}
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
    ),
    attack: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            {/* Lightning bolt for attack power */}
            <path d="M13 2L3 14h8l-2 8 10-12h-8l2-8z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round" />
        </svg>
    ),
    receive: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            {/* Target/bullseye for receiving accuracy */}
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
            <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="2" fill="none" />
            <circle cx="12" cy="12" r="2" fill="currentColor" />
        </svg>
    ),
    serve: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            {/* Arrow launching upward for serve */}
            <path d="M12 19V5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
};

// Individual Player Performance Card Component
function PlayerPerformanceCard({
    value,
    label,
    playerValue,
    teamValue,
    isLowerBetter = false,
    cardType = 'default'
}) {
    const calculateComparison = (pValue, tValue) => {
        if (pValue === null || pValue === undefined || isNaN(pValue) ||
            tValue === null || tValue === undefined || isNaN(tValue)) {
            return { percentage: 0, isIncrease: false, display: '—', status: 'neutral' };
        }

        const percentage = ((pValue - tValue) / tValue) * 100;
        const isIncrease = percentage > 0;
        const absPercentage = Math.abs(percentage);

        let status;
        if (absPercentage < 5) status = 'neutral';
        else if (isLowerBetter ? !isIncrease : isIncrease) status = 'excellent';
        else status = 'needs-attention';

        const display = `${isIncrease ? '+' : ''}${Math.round(percentage)}%`;
        return { percentage, isIncrease, display, status };
    };

    const comparison = calculateComparison(playerValue, teamValue);

    // Card type configurations
    const cardConfigs = {
        errors: {
            accentColor: '#da1e28',
            backgroundColor: '#fff1f1',
            borderColor: '#da1e28',
            icon: MetricIcons.errors,
            borderRadius: '4px',
            pattern: 'diagonal'
        },
        attack: {
            accentColor: '#673ab7',
            backgroundColor: '#f3e5f5',
            borderColor: '#673ab7',
            icon: MetricIcons.attack,
            borderRadius: '8px',
            pattern: 'solid'
        },
        receive: {
            accentColor: '#009d9a',
            backgroundColor: '#e0f2f1',
            borderColor: '#009d9a',
            icon: MetricIcons.receive,
            borderRadius: '8px',
            pattern: 'solid'
        },
        serve: {
            accentColor: '#ff7043',
            backgroundColor: '#fff3e0',
            borderColor: '#ff7043',
            icon: MetricIcons.serve,
            borderRadius: '8px',
            pattern: 'solid'
        }
    };

    const config = cardConfigs[cardType] || cardConfigs.attack;

    // Status-based styling
    const statusColors = {
        excellent: '#24a148',
        'needs-attention': '#da1e28',
        neutral: '#78909c'
    };

    const comparisonColor = statusColors[comparison.status];
    const trendIcon = comparison.display === '—' ? '—' : (comparison.isIncrease ? '▲' : '▼');

    return (
        <div
            style={{
                background: `linear-gradient(135deg, ${config.backgroundColor} 0%, #ffffff 100%)`,
                border: `1px solid ${config.borderColor}20`,
                borderTop: `4px solid ${config.accentColor}`,
                borderRadius: config.borderRadius,
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '200px',
                width: '280px',
                flexShrink: 0,
                padding: '24px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'default',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}
            onMouseEnter={(e) => {
                const card = e.currentTarget;
                card.style.transform = 'translateY(-2px)';
                card.style.borderColor = config.accentColor;
                card.style.boxShadow = `0 4px 16px rgba(0, 0, 0, 0.15), 0 0 0 1px ${config.accentColor}20, inset 0 4px 0 0 ${config.accentColor}`;
            }}
            onMouseLeave={(e) => {
                const card = e.currentTarget;
                card.style.transform = 'translateY(0)';
                card.style.borderColor = `${config.borderColor}20`;
                card.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
            }}
        >
            {/* Card Header with Icon */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
            }}>
                <div style={{
                    color: config.accentColor,
                    marginRight: '8px'
                }}>
                    {config.icon}
                </div>
                <div style={{
                    color: '#6c757d',
                    fontWeight: '500',
                    fontSize: '14px',
                    letterSpacing: '0.25px',
                    textTransform: 'uppercase'
                }}>
                    {label}
                </div>
            </div>

            {/* Primary Metric Value */}
            <div style={{
                fontSize: '48px',
                fontWeight: '700',
                color: '#212529',
                lineHeight: '1',
                marginBottom: '8px',
                letterSpacing: '-0.02em'
            }}>
                {value}
            </div>

            {/* Comparison Section */}
            <div style={{
                marginTop: '16px',
                padding: '12px 16px',
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                borderRadius: '8px',
                border: `1px solid ${comparisonColor}30`
            }}>
                <div style={{
                    fontSize: '12px',
                    color: '#6c757d',
                    marginBottom: '4px',
                    fontWeight: '500'
                }}>
                    vs Team Average
                </div>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                }}>
                    <span style={{
                        fontSize: '16px',
                        fontWeight: '700',
                        color: comparisonColor
                    }}>
                        {trendIcon}
                    </span>
                    <span style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: comparisonColor
                    }}>
                        {comparison.display}
                    </span>
                    <span style={{
                        fontSize: '12px',
                        color: '#6c757d',
                        marginLeft: '4px'
                    }}>
                        {comparison.status === 'excellent' ? 'Excellent' :
                            comparison.status === 'needs-attention' ? 'Needs Work' : 'On Target'}
                    </span>
                </div>
            </div>

            {/* Subtle background pattern for visual distinction */}
            {config.pattern === 'diagonal' && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '60px',
                    height: '60px',
                    background: `linear-gradient(45deg, transparent 40%, ${config.accentColor}10 45%, ${config.accentColor}10 55%, transparent 60%)`,
                    pointerEvents: 'none'
                }} />
            )}
        </div>
    );
}

// Main PlayerPerformance Component
export default function PlayerPerformance({ playerSummary, teamSummary, playerName, isLoading }) {
    // Enhanced debugging
    useEffect(() => {
        console.log('🎯 PlayerPerformance Component Mounted/Updated:', {
            playerName,
            isLoading,
            playerSummaryExists: !!playerSummary,
            teamSummaryExists: !!teamSummary,
            playerSummaryKeys: playerSummary ? Object.keys(playerSummary) : [],
            teamSummaryKeys: teamSummary ? Object.keys(teamSummary) : [],
            playerData: playerSummary,
            teamData: teamSummary,
            timestamp: new Date().toISOString()
        });
    }, [playerName, isLoading, playerSummary, teamSummary]);

    // Show loading state
    if (isLoading) {
        return (
            <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    margin: '0 auto 16px',
                    border: '3px solid #f3f3f3',
                    borderTop: '3px solid #3464f6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }}></div>
                <p style={{ color: '#6c757d' }}>Loading player metrics...</p>
                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    const formatPercentage = (value) => {
        if (value === null || value === undefined || isNaN(value)) {
            return '—';
        }
        return `${Math.round(value * 100)}%`;
    };

    const formatDecimal = (value, decimals = 1) => {
        if (value === null || value === undefined || isNaN(value)) {
            return '—';
        }
        return Number(value).toFixed(decimals);
    };

    // Show error state if no data at all
    if (!playerSummary && !teamSummary && !isLoading) {
        return (
            <div style={{
                background: 'linear-gradient(135deg, #ffebee 0%, #ffffff 100%)',
                color: '#d32f2f',
                padding: '32px',
                textAlign: 'center',
                borderRadius: '12px',
                border: '1px solid #ffcdd2',
                borderTop: '4px solid #d32f2f',
                fontFamily: 'Inter, sans-serif'
            }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>
                    Data Loading Error
                </h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '14px', opacity: 0.8 }}>
                    Unable to load performance metrics for {playerName || 'this player'}.
                </p>
                <div style={{
                    background: '#fff',
                    padding: '12px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    textAlign: 'left',
                    color: '#666'
                }}>
                    <div>Player Name: {playerName || 'undefined'}</div>
                    <div>Player Data: {JSON.stringify(playerSummary) || 'null'}</div>
                    <div>Team Data: {JSON.stringify(teamSummary) || 'null'}</div>
                </div>
            </div>
        );
    }

    // Render component even with partial data
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '32px',
            width: '100%',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
            {/* Section Header */}
            <div style={{ textAlign: 'center' }}>
                <h2 style={{
                    fontSize: '42px',
                    fontWeight: '700',
                    color: '#ffffffff',
                    margin: '0 0 8px 0',
                    letterSpacing: '-0.02em',
                    textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                    {playerName || 'Player'}
                </h2>
                <div style={{
                    fontSize: '22px',
                    fontWeight: '500',
                    color: '#3464f6',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    marginBottom: '16px'
                }}>
                    Performance Metrics
                </div>
                <div style={{
                    width: '500px',
                    height: '4px',
                    background: 'linear-gradient(90deg, #3464f6, #673ab7)',
                    margin: '0 auto 8px auto',
                    borderRadius: '2px'
                }}></div>
                <p style={{
                    color: '#6c757d',
                    fontSize: '14px',
                    margin: '0',
                    fontWeight: '400'
                }}>
                    {playerSummary && teamSummary
                        ? 'Individual performance compared to team averages'
                        : 'Loading performance data...'}
                </p>
            </div>

            {/* Debug Info Box - VISIBLE FOR DEBUGGING */}
            {/* Temporarily hidden - set display to 'block' to show debug info */}
            <div style={{
                display: 'none', // Changed from block to none
                background: 'rgba(0, 0, 0, 0.8)',
                color: '#0f0',
                padding: '16px',
                borderRadius: '8px',
                fontSize: '12px',
                fontFamily: 'monospace',
                border: '1px solid #0f0',
                maxHeight: '200px',
                overflow: 'auto'
            }}>
                <div style={{ marginBottom: '8px', color: '#ff0' }}>🔍 DEBUG INFO:</div>
                <div>Player Name: {playerName}</div>
                <div>Is Loading: {String(isLoading)}</div>
                <div>Has Player Summary: {String(!!playerSummary)}</div>
                <div>Has Team Summary: {String(!!teamSummary)}</div>
                {playerSummary && (
                    <div style={{ marginTop: '8px' }}>
                        <div style={{ color: '#ff0' }}>Player Data:</div>
                        <pre style={{ margin: 0, fontSize: '11px' }}>
                            {JSON.stringify(playerSummary, null, 2)}
                        </pre>
                    </div>
                )}
                {teamSummary && (
                    <div style={{ marginTop: '8px' }}>
                        <div style={{ color: '#ff0' }}>Team Data:</div>
                        <pre style={{ margin: 0, fontSize: '11px' }}>
                            {JSON.stringify(teamSummary, null, 2)}
                        </pre>
                    </div>
                )}
            </div>

            {/* Performance Cards Grid */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '24px',
                width: '100%'
            }}>
                <PlayerPerformanceCard
                    value={formatDecimal(playerSummary?.avg_errors_per_set)}
                    label="Avg Errors per Set"
                    playerValue={playerSummary?.avg_errors_per_set}
                    teamValue={teamSummary?.avg_errors_per_set}
                    isLowerBetter={true}
                    cardType="errors"
                />

                <PlayerPerformanceCard
                    value={formatPercentage(playerSummary?.atk_accuracy)}
                    label="Attack Efficiency"
                    playerValue={playerSummary?.atk_accuracy}
                    teamValue={teamSummary?.atk_accuracy}
                    isLowerBetter={false}
                    cardType="attack"
                />

                <PlayerPerformanceCard
                    value={formatPercentage(playerSummary?.rcv_accuracy)}
                    label="Receiving Accuracy"
                    playerValue={playerSummary?.rcv_accuracy}
                    teamValue={teamSummary?.rcv_accuracy}
                    isLowerBetter={false}
                    cardType="receive"
                />

                <PlayerPerformanceCard
                    value={formatPercentage(playerSummary?.srv_accuracy)}
                    label="Serving Accuracy"
                    playerValue={playerSummary?.srv_accuracy}
                    teamValue={teamSummary?.srv_accuracy}
                    isLowerBetter={false}
                    cardType="serve"
                />
            </div>

            {/* Performance Summary */}
            <div style={{
                background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                border: '1px solid #e0e0e0',
                borderRadius: '12px',
                padding: '24px',
                textAlign: 'center'
            }}>
                <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#212529',
                    margin: '0 0 8px 0'
                }}>
                    Performance Overview
                </h3>
                <p style={{
                    fontSize: '14px',
                    color: '#6c757d',
                    margin: '0',
                    lineHeight: '1.5'
                }}>
                    {playerSummary && teamSummary
                        ? `This player's metrics are compared against team averages.
                           Each card presents different performance categories,
                           while the comparison indicators show relative performance status.`
                        : 'Waiting for data to load...'}
                </p>
            </div>
        </div>
    );
}