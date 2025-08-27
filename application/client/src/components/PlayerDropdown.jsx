// components/PlayerDropdown.jsx
import React, { useState, useRef, useEffect } from "react";
import { resolvePlayer } from "../api.js";

export default function PlayerDropdown({ players, value, onChange, token }) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [resolvedPlayers, setResolvedPlayers] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSuggestion, setShowSuggestion] = useState(false);
    const dropdownRef = useRef(null);
    const inputRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchQuery("");
                setShowSuggestion(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Debounced search for player resolution
    useEffect(() => {
        if (!searchQuery.trim() || !token) {
            setResolvedPlayers([]);
            setShowSuggestion(false);
            return;
        }

        const timeoutId = setTimeout(async () => {
            setIsSearching(true);
            try {
                const result = await resolvePlayer(token, searchQuery);
                setResolvedPlayers(result.players || []);

                // Show suggestion if there's a resolved match different from the query
                if (result.resolved && result.resolved.name &&
                    result.resolved.name.toLowerCase() !== searchQuery.toLowerCase()) {
                    setShowSuggestion(result.resolved);
                } else {
                    setShowSuggestion(false);
                }
            } catch (error) {
                console.error('Error resolving player:', error);
                setResolvedPlayers([]);
                setShowSuggestion(false);
            } finally {
                setIsSearching(false);
            }
        }, 300); // 300ms debounce

        return () => clearTimeout(timeoutId);
    }, [searchQuery, token]);

    // Filter players based on search
    const filteredPlayers = searchQuery.trim()
        ? resolvedPlayers.length > 0
            ? resolvedPlayers
            : players.filter(player =>
                player.toLowerCase().includes(searchQuery.toLowerCase())
            )
        : players;

    const handleSelect = (playerName) => {
        onChange(playerName);
        setIsOpen(false);
        setSearchQuery("");
        setShowSuggestion(false);
    };

    const handleSuggestionAccept = () => {
        if (showSuggestion && showSuggestion.name) {
            handleSelect(showSuggestion.name);
        }
    };

    const displayValue = value || "All Players";

    return (
        <div ref={dropdownRef} style={{ position: 'relative', minWidth: '280px' }}>
            {/* Main Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '100%',
                    padding: '14px 18px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '14px',
                    color: 'var(--text-primary)',
                    fontSize: '15px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    minHeight: '50px'
                }}
                onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(255, 255, 255, 0.06)';
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                }}
                onMouseLeave={(e) => {
                    e.target.style.background = 'rgba(255, 255, 255, 0.04)';
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                }}
            >
                <span style={{
                    color: value ? 'var(--text-primary)' : 'var(--text-muted)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                }}>
                    {displayValue}
                </span>
                <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    style={{
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                        flexShrink: 0,
                        marginLeft: '8px'
                    }}
                >
                    <path
                        d="M6 9l6 6 6-6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    background: 'rgba(15, 23, 42, 0.95)',
                    backdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                    zIndex: 1000,
                    maxHeight: '280px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {/* Search Input */}
                    <div style={{ padding: '12px' }}>
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Search players..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                background: 'rgba(255, 255, 255, 0.06)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '8px',
                                color: 'var(--text-primary)',
                                fontSize: '14px',
                                outline: 'none'
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = 'rgba(14, 165, 233, 0.5)';
                                e.target.style.background = 'rgba(255, 255, 255, 0.08)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                e.target.style.background = 'rgba(255, 255, 255, 0.06)';
                            }}
                        />

                        {/* Search Status */}
                        {isSearching && (
                            <div style={{
                                marginTop: '8px',
                                padding: '4px 8px',
                                fontSize: '12px',
                                color: 'var(--text-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                                <div style={{
                                    width: '12px',
                                    height: '12px',
                                    border: '2px solid rgba(14, 165, 233, 0.3)',
                                    borderTop: '2px solid #0ea5e9',
                                    borderRadius: '50%',
                                    animation: 'spin 1s linear infinite'
                                }} />
                                Searching...
                            </div>
                        )}

                        {/* Smart Suggestion */}
                        {showSuggestion && !isSearching && (
                            <div style={{
                                marginTop: '8px',
                                padding: '8px',
                                background: 'rgba(14, 165, 233, 0.1)',
                                border: '1px solid rgba(14, 165, 233, 0.2)',
                                borderRadius: '6px',
                                fontSize: '12px'
                            }}>
                                <div style={{
                                    color: 'var(--text-muted)',
                                    marginBottom: '4px'
                                }}>
                                    Did you mean:
                                </div>
                                <button
                                    onClick={handleSuggestionAccept}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#0ea5e9',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        padding: '2px 0'
                                    }}
                                >
                                    {showSuggestion.name}
                                </button>
                                {showSuggestion.confidence && (
                                    <span style={{
                                        color: 'var(--text-muted)',
                                        marginLeft: '8px'
                                    }}>
                                        ({Math.round(showSuggestion.confidence * 100)}% match)
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Options List */}
                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        borderTop: '1px solid rgba(255, 255, 255, 0.06)'
                    }}>
                        {/* All Players Option */}
                        <button
                            onClick={() => handleSelect("")}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                background: value === "" ? 'rgba(14, 165, 233, 0.1)' : 'transparent',
                                border: 'none',
                                color: value === "" ? '#0ea5e9' : 'var(--text-primary)',
                                fontSize: '14px',
                                textAlign: 'left',
                                cursor: 'pointer',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                                transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                                if (value !== "") {
                                    e.target.style.background = 'rgba(255, 255, 255, 0.04)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (value !== "") {
                                    e.target.style.background = 'transparent';
                                }
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                                    <path d="M23 21v-2a4 4 0 00-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                All Players
                            </div>
                        </button>

                        {/* Individual Players */}
                        {filteredPlayers.length > 0 ? (
                            filteredPlayers.map((player, index) => (
                                <button
                                    key={`${player}-${index}`}
                                    onClick={() => handleSelect(player)}
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        background: value === player ? 'rgba(14, 165, 233, 0.1)' : 'transparent',
                                        border: 'none',
                                        color: value === player ? '#0ea5e9' : 'var(--text-primary)',
                                        fontSize: '14px',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        borderBottom: index < filteredPlayers.length - 1 ? '1px solid rgba(255, 255, 255, 0.04)' : 'none',
                                        transition: 'all 0.15s ease',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (value !== player) {
                                            e.target.style.background = 'rgba(255, 255, 255, 0.04)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (value !== player) {
                                            e.target.style.background = 'transparent';
                                        }
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                                        </svg>
                                        {player}
                                    </div>
                                </button>
                            ))
                        ) : searchQuery.trim() && !isSearching ? (
                            <div style={{
                                padding: '16px',
                                textAlign: 'center',
                                color: 'var(--text-muted)',
                                fontSize: '14px'
                            }}>
                                No players found matching "{searchQuery}"
                            </div>
                        ) : null}
                    </div>
                </div>
            )}

            <style>
                {`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}
            </style>
        </div>
    );
}