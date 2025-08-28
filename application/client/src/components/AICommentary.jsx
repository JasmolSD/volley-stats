// components/AICommentary.jsx
import React, { useState, useEffect } from 'react';
import './AICommentary.css'; // Add this import

export default function AICommentary({
    commentary,
    commentaryGenerated,
    loadingCommentary,
    selectedPlayer,
    plots,
    mode,
    onGenerateCommentary,
    modelsUsed,
    commentarySummary,
    availablePlayers = [] // Add this prop for player name highlighting
}) {
    // Loading text rotation state
    const [loadingTextIndex, setLoadingTextIndex] = useState(0);

    // Array of loading messages with time estimate
    const loadingTexts = [
        "Analyzing data...\nThis typically takes 3-5 minutes",
        "Processing visualizations...\nPlease wait 3-5 minutes",
        "Generating insights...\nUsually completes in 3-5 minutes",
        "Evaluating performance metrics...\n3-5 minutes remaining",
        "Compiling comprehensive analysis...\nThis takes 3-5 minutes",
        "Almost there...\nTotal time is typically 3-5 minutes"
    ];

    // Rotate loading text every 40 seconds
    useEffect(() => {
        if (loadingCommentary) {
            const interval = setInterval(() => {
                setLoadingTextIndex((prev) => (prev + 1) % loadingTexts.length);
            }, 40000);
            return () => clearInterval(interval);
        } else {
            // Reset index when not loading
            setLoadingTextIndex(0);
        }
    }, [loadingCommentary, loadingTexts.length]);

    // Format model names for display
    const formatModelName = (modelId) => {
        if (!modelId) return 'Unknown';

        // Handle special cases
        if (modelId === 'statistical_analysis') return 'Statistical Analysis';
        if (modelId === 'none') return 'N/A';

        // Extract readable name from model ID
        const parts = modelId.split('/');
        const modelName = parts[parts.length - 1];

        // Clean up common suffixes
        return modelName
            .replace('-Instruct', '')
            .replace('-instruct', '')
            .replace(/-/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    // Function to highlight both numbers and player names
    const highlightContent = (text) => {
        // Create a regex pattern for player names (case-insensitive)
        const playerPattern = availablePlayers.length > 0
            ? availablePlayers.map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
            : null;

        // Combined pattern for numbers and player names
        const combinedPattern = playerPattern
            ? new RegExp(`(\\d+\\.?\\d*%?)|(\\b(?:${playerPattern})\\b)`, 'gi')
            : /(\d+\.?\d*%?)/g;

        const parts = text.split(combinedPattern);

        return parts.map((part, i) => {
            if (!part) return null;

            // Check if it's a number
            if (/^\d+\.?\d*%?$/.test(part)) {
                return (
                    <span key={i} className="commentary-number">
                        {part}
                    </span>
                );
            }

            // Check if it's a player name
            if (playerPattern && new RegExp(`^(${playerPattern})$`, 'i').test(part)) {
                return (
                    <span key={i} className="commentary-player-name">
                        {part}
                    </span>
                );
            }

            return part;
        });
    };

    // Helper function to clean content text
    const cleanContent = (text) => {
        if (!text) return '';
        // Remove leading colons, spaces, bullets, asterisks, and other unwanted symbols
        return text.replace(/^[\s:•\-*]+/, '').trim();
    };

    // Parse bold text with ** markers
    const parseBoldText = (text) => {
        // First, handle the specific cases of :** and : ** which should become just :
        text = text.replace(/:\*\*/g, ':');
        text = text.replace(/:\s\*\*/g, ': ');

        const parts = text.split(/(\*\*[^*]+\*\*)/);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                const boldText = part.replace(/\*\*/g, '');
                return (
                    <strong key={i} className="commentary-bold">
                        {highlightContent(boldText)}
                    </strong>
                );
            }
            return highlightContent(part);
        });
    };

    return (
        <div className="ai-commentary">
            {/* Full overlay spinner when regenerating */}
            {loadingCommentary && commentaryGenerated && (
                <div className="commentary-overlay">
                    <div className="overlay-spinner-container">
                        <div className="loading-spinner-large"></div>
                        <p className="overlay-text">
                            {loadingTexts[loadingTextIndex].split('\n').map((line, i) => (
                                <React.Fragment key={i}>
                                    {line}
                                    {i < loadingTexts[loadingTextIndex].split('\n').length - 1 && <br />}
                                </React.Fragment>
                            ))}
                        </p>
                    </div>
                </div>
            )}

            {!commentaryGenerated ? (
                <div className="commentary-placeholder">
                    <div className="commentary-icon">💡</div>
                    <h3>Generate AI Insights</h3>
                    <p className="placeholder-description">
                        {plots.length > 0
                            ? `Analyze ${plots.length} visualizations and performance data for ${selectedPlayer || 'Team'} in ${mode} mode`
                            : 'Generate comprehensive performance insights based on your data'
                        }
                    </p>
                    <button
                        className="btn btn-primary"
                        onClick={onGenerateCommentary}
                        disabled={loadingCommentary}
                    >
                        {loadingCommentary ? (
                            <>
                                <span className="loading-spinner-small"></span>
                                <span className="loading-button-text">
                                    Analyzing...
                                </span>
                            </>
                        ) : (
                            <>
                                <span>✨</span>
                                Generate Commentary
                            </>
                        )}
                    </button>
                    {loadingCommentary && (
                        <p className="loading-time-notice">
                            ⏱️ Analysis typically takes 3-5 minutes to complete.
                            Please wait while we process your data...
                        </p>
                    )}
                </div>
            ) : (
                <div className="commentary-content">
                    {/* Model Information Header */}
                    {modelsUsed && (
                        <div className="model-info-header">
                            {modelsUsed.method === 'statistical_analysis' ? (
                                <h3 className="model-header statistical-header">
                                    <span className="model-icon">📊</span>
                                    Statistical Analysis
                                </h3>
                            ) : (
                                modelsUsed.text && modelsUsed.text !== 'statistical_analysis' && (
                                    <>
                                        <h3 className="model-header">
                                            <span className="model-icon">🤖</span>
                                            <span className="ai-header-text">
                                                AI-Powered Analysis
                                            </span>
                                        </h3>
                                        <div className="models-used">
                                            <h4 className="models-label">Models</h4>
                                            <div className="model-chips-container">
                                                <span className="model-chip text-model">
                                                    🔍 Language Model: {formatModelName(modelsUsed.text)}
                                                </span>
                                                {modelsUsed.vision && modelsUsed.vision !== 'none' && (
                                                    <span className="model-chip vision-model">
                                                        👁️ Vision Model: {formatModelName(modelsUsed.vision)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )
                            )}

                            {modelsUsed.note && (
                                <p className="model-note">
                                    ℹ️ {modelsUsed.note}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Commentary Text */}
                    <div className="commentary-text">
                        {/* Divider bar between models and commentary */}
                        <div className="commentary-divider"></div>

                        {commentary.split('\n').map((paragraph, idx, allParagraphs) => {
                            if (paragraph.trim()) {
                                const trimmed = paragraph.trim();

                                // Skip lines that were marked as processed
                                if (trimmed === '') return null;

                                // Main section headers with ### 
                                if (trimmed.startsWith('###')) {
                                    const headerText = trimmed.replace(/^###\s*/, '');
                                    return (
                                        <h3 key={idx} className={`commentary-main-header ${idx === 0 ? 'first-header' : ''}`}>
                                            {headerText}
                                        </h3>
                                    );
                                }

                                // Insight headers (e.g., "**Insight 1: Strengths**")
                                else if (trimmed.match(/^\*\*Insight\s+\d+:.*\*\*$/)) {
                                    const headerText = trimmed.replace(/\*\*/g, '');
                                    return (
                                        <h3 key={idx} className="commentary-insight-header">
                                            {headerText}
                                        </h3>
                                    );
                                }

                                // Main section headers with ** (backwards compatibility)
                                else if (trimmed.startsWith('**') && trimmed.endsWith('**') && !trimmed.includes(':')) {
                                    const headerText = trimmed.replace(/\*\*/g, '');
                                    return (
                                        <h3 key={idx} className={`commentary-main-header ${idx === 0 ? 'first-header' : ''}`}>
                                            {headerText}
                                        </h3>
                                    );
                                }

                                // Bullet points with * at the start
                                else if (trimmed.startsWith('* ')) {
                                    // Remove the asterisk and space, then process as before
                                    const bulletContent = trimmed.substring(2).trim();
                                    return (
                                        <div key={idx} className="commentary-numbered-item no-number">
                                            <div className="commentary-item-content full-width">
                                                <span className="commentary-item-text">
                                                    {parseBoldText(bulletContent)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                }

                                // Check if this line is just a number with or without ** (1, 2, 3, etc. or **1**, **2**, etc.) 
                                else if (/^(\*\*)?\d+(\*\*)?$/.test(trimmed)) {
                                    const number = trimmed.replace(/\*\*/g, '');
                                    const nextIdx = idx + 1;

                                    // Look for the label and content in next lines
                                    if (nextIdx < allParagraphs.length) {
                                        const labelLine = allParagraphs[nextIdx]?.trim();

                                        // Check if the label line has bold formatting
                                        if (labelLine && labelLine.startsWith('**')) {
                                            // Extract label and inline content from format like "**Receiving and Attacking**: content"
                                            if (labelLine.includes('**:')) {
                                                // Match pattern: **Label**: content
                                                const labelParts = labelLine.match(/^\*\*([^*]+)\*\*:\s*(.*)$/);
                                                if (labelParts) {
                                                    const [, label, inlineContent] = labelParts;

                                                    // Clean the label - remove any trailing colon if present
                                                    const cleanLabel = label.replace(/:+$/, '').trim();

                                                    // Check if there's additional content on the next line
                                                    const contentLine = allParagraphs[nextIdx + 1]?.trim();
                                                    let fullContent = cleanContent(inlineContent);

                                                    // If there's content on the next line that's not a header or number
                                                    if (contentLine && !contentLine.startsWith('**') && !/^(\*\*)?\d+(\*\*)?$/.test(contentLine) && !contentLine.startsWith('* ')) {
                                                        const cleanedNextContent = cleanContent(contentLine);
                                                        fullContent = fullContent ? fullContent + ' ' + cleanedNextContent : cleanedNextContent;
                                                        allParagraphs[nextIdx + 1] = '';
                                                    }

                                                    // Mark processed line
                                                    allParagraphs[nextIdx] = '';

                                                    return (
                                                        <div key={idx} className="commentary-numbered-item">
                                                            <span className="commentary-number-badge">
                                                                {number}
                                                            </span>
                                                            <div className="commentary-item-content">
                                                                <strong className="commentary-item-label">
                                                                    {cleanLabel}
                                                                </strong>
                                                                <div className="commentary-item-text">
                                                                    {highlightContent(fullContent)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                            } else {
                                                // Handle format like "**Label**" on one line, content on next
                                                const cleanLabel = labelLine.replace(/\*\*/g, '').replace(/:+$/, '').trim();
                                                const contentLine = allParagraphs[nextIdx + 1]?.trim();

                                                if (contentLine && !contentLine.startsWith('**') && !/^(\*\*)?\d+(\*\*)?$/.test(contentLine) && !contentLine.startsWith('* ')) {
                                                    const cleanedContent = cleanContent(contentLine);

                                                    // Mark these lines as processed
                                                    allParagraphs[nextIdx] = '';
                                                    allParagraphs[nextIdx + 1] = '';

                                                    return (
                                                        <div key={idx} className="commentary-numbered-item">
                                                            <span className="commentary-number-badge">
                                                                {number}
                                                            </span>
                                                            <div className="commentary-item-content">
                                                                <strong className="commentary-item-label">
                                                                    {cleanLabel}
                                                                </strong>
                                                                <span className="commentary-item-text">
                                                                    {highlightContent(cleanedContent)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                            }
                                        }
                                    }
                                }

                                // Numbered items with dot notation (1. 2. 3. etc)
                                else if (trimmed.match(/^\d+\.\s/)) {
                                    // Handle both formats: "1. **Label:** Content" and "1. Content"
                                    if (trimmed.match(/^\d+\.\s*\*\*/)) {
                                        // Format: "1. **Service Accuracy:** content"
                                        const parts = trimmed.match(/^(\d+)\.\s*\*\*([^:*]+):?\*\*\s*:?\s*(.*)$/);
                                        if (parts) {
                                            const [, number, label, content] = parts;
                                            const cleanedContent = cleanContent(content);
                                            return (
                                                <div key={idx} className="commentary-numbered-item">
                                                    <span className="commentary-number-badge">
                                                        {number}
                                                    </span>
                                                    <div className="commentary-item-content">
                                                        <strong className="commentary-item-label">
                                                            {label.trim()}
                                                        </strong>
                                                        <span className="commentary-item-text">
                                                            {highlightContent(cleanedContent)}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        }
                                    } else {
                                        // Simple format: "1. Content without label"
                                        const parts = trimmed.match(/^(\d+)\.\s*(.*)$/);
                                        if (parts) {
                                            const [, number, content] = parts;
                                            const cleanedContent = cleanContent(content);
                                            return (
                                                <div key={idx} className="commentary-numbered-item simple">
                                                    <span className="commentary-number-badge">
                                                        {number}
                                                    </span>
                                                    <div className="commentary-item-content">
                                                        <span className="commentary-item-text">
                                                            {highlightContent(cleanedContent)}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        }
                                    }
                                }

                                // Bullet points (•) or dash or arrow
                                else if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('→')) {
                                    let bulletContent = cleanContent(trimmed.replace(/^[•\-→]\s*/, ''));

                                    // Clean up **: ** pattern after player names
                                    bulletContent = bulletContent.replace(/\*\*([^*]+)\*\*:\s*\*\*/g, '**$1**:');

                                    // Check if this is a player-specific bullet (e.g., "**Allyn**:" or "Allyn:")
                                    let processedContent;
                                    const playerBulletMatch = bulletContent.match(/^\*\*([^*]+)\*\*:\s*(.*)$/);
                                    const simplePlayerMatch = bulletContent.match(/^([^:]+):\s*(.*)$/);

                                    if (playerBulletMatch) {
                                        // Format: "**PlayerName**: content"
                                        const [, playerName, content] = playerBulletMatch;
                                        // Clean any leading ** from content
                                        const cleanedContent = content.replace(/^\*\*\s*/, '');
                                        processedContent = (
                                            <>
                                                <strong className="commentary-bold">
                                                    {highlightContent(playerName)}
                                                </strong>
                                                {': '}
                                                {parseBoldText(cleanedContent)}
                                            </>
                                        );
                                    } else if (simplePlayerMatch && availablePlayers?.some(p =>
                                        simplePlayerMatch[1].trim().toLowerCase() === p.toLowerCase()
                                    )) {
                                        // Format: "PlayerName: content" (without bold markers)
                                        const [, playerName, content] = simplePlayerMatch;
                                        // Clean any leading ** from content
                                        const cleanedContent = content.replace(/^\*\*\s*/, '');
                                        processedContent = (
                                            <>
                                                <strong className="commentary-bold">
                                                    {highlightContent(playerName.trim())}
                                                </strong>
                                                {': '}
                                                {parseBoldText(cleanedContent)}
                                            </>
                                        );
                                    } else {
                                        // Regular bullet content
                                        processedContent = parseBoldText(bulletContent);
                                    }

                                    return (
                                        <div key={idx} className="commentary-bullet-point">
                                            <span className="bullet-icon">✦</span>
                                            <span className="bullet-content">
                                                {processedContent}
                                            </span>
                                        </div>
                                    );
                                }

                                // Check for inline bold text
                                else if (trimmed.includes('**')) {
                                    return (
                                        <p key={idx} className="commentary-paragraph">
                                            {parseBoldText(trimmed)}
                                        </p>
                                    );
                                }

                                // Regular paragraphs
                                else {
                                    return (
                                        <p key={idx} className="commentary-paragraph">
                                            {highlightContent(trimmed)}
                                        </p>
                                    );
                                }
                            }
                            return null;
                        })}
                    </div>

                    {/* Additional Stats from Summary (if available) */}
                    {commentarySummary && commentarySummary.mode_specific_stats && (
                        <>
                            {/* Divider bar before Analysis Context */}
                            <div className="commentary-divider"></div>

                            <div className="commentary-stats">
                                <h4 className="stats-header">
                                    <span className="stat-icon">📊</span>
                                    Analysis Context
                                </h4>
                                <div className="stats-grid">
                                    <div className="stat-item">
                                        <span className="stat-label">Mode</span>
                                        <span className="stat-value">
                                            {mode.charAt(0).toUpperCase() + mode.slice(1)}
                                        </span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Player</span>
                                        <span className="stat-value">
                                            {selectedPlayer || 'All Players'}
                                        </span>
                                    </div>
                                    {commentarySummary.mode_specific_stats.games_analyzed && (
                                        <div className="stat-item">
                                            <span className="stat-label">Games Analyzed</span>
                                            <span className="stat-value">
                                                {commentarySummary.mode_specific_stats.games_analyzed}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Regenerate Button */}
                    <div className="commentary-actions">
                        <button
                            className="btn-regenerate"
                            onClick={onGenerateCommentary}
                            disabled={loadingCommentary}
                        >
                            {loadingCommentary ? (
                                <>
                                    <span className="loading-spinner-small"></span>
                                    <span className="loading-button-text">
                                        Regenerating... (3-5 minutes)
                                    </span>
                                </>
                            ) : (
                                <>
                                    🔄 Regenerate Insights
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}