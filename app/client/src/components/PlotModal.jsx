// components/PlotModal.jsx
import React, { useEffect, useRef, useState } from "react";
import "./PlotModal.css";

export default function PlotModal({ title, src, onClose }) {
    const backdropRef = useRef(null);
    const frameRef = useRef(null);
    const imgRef = useRef(null);

    const [scale, setScale] = useState(1);
    const [tx, setTx] = useState(0);
    const [ty, setTy] = useState(0);
    const [drag, setDrag] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [baseScale, setBaseScale] = useState(1); // Track the base "fit to screen" scale

    // Fit-to-frame when the image loads
    useEffect(() => {
        const img = imgRef.current;
        const frame = frameRef.current;
        if (!img || !frame) return;

        const handleLoad = () => {
            const fw = frame.clientWidth;
            const fh = frame.clientHeight;
            const iw = img.naturalWidth;
            const ih = img.naturalHeight;

            if (iw && ih && fw && fh) {
                const fitScale = Math.min(fw / iw, fh / ih) * 0.9; // 90% to add padding
                setScale(fitScale);
                setBaseScale(fitScale); // Store as base scale
                setTx(0);
                setTy(0);
            }
        };

        img.addEventListener("load", handleLoad);
        handleLoad(); // Call immediately if already loaded
        return () => img.removeEventListener("load", handleLoad);
    }, [src]);

    // Update base scale when window resizes or fullscreen changes
    useEffect(() => {
        const updateBaseScale = () => {
            const img = imgRef.current;
            const frame = frameRef.current;
            if (img && frame) {
                const fw = frame.clientWidth;
                const fh = frame.clientHeight;
                const iw = img.naturalWidth;
                const ih = img.naturalHeight;
                if (iw && ih && fw && fh) {
                    const fitScale = Math.min(fw / iw, fh / ih) * 0.9;
                    setBaseScale(fitScale);
                }
            }
        };

        window.addEventListener('resize', updateBaseScale);
        updateBaseScale(); // Update immediately

        return () => window.removeEventListener('resize', updateBaseScale);
    }, [isFullscreen]);

    // Keyboard shortcuts
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "+" || e.key === "=") zoomIn();
            if (e.key === "-" || e.key === "_") zoomOut();
            if (e.key.toLowerCase() === "r") refit();
            if (e.key.toLowerCase() === "f") toggleFullscreen();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose, scale, baseScale]);

    const zoomIn = () => setScale((s) => Math.min(s * 1.2, 5));
    const zoomOut = () => setScale((s) => Math.max(s * 0.8, baseScale)); // Prevent zooming out past base scale

    const refit = () => {
        const img = imgRef.current;
        const frame = frameRef.current;
        if (img && frame) {
            const fw = frame.clientWidth;
            const fh = frame.clientHeight;
            const iw = img.naturalWidth;
            const ih = img.naturalHeight;
            const fitScale = Math.min(fw / iw, fh / ih) * 0.9;
            setScale(fitScale);
            setBaseScale(fitScale);
        }
        setTx(0);
        setTy(0);
    };

    const toggleFullscreen = () => {
        if (!isFullscreen) {
            // Entering fullscreen - use browser's fullscreen API
            const container = document.querySelector('.pm-container');
            if (container.requestFullscreen) {
                container.requestFullscreen();
            } else if (container.webkitRequestFullscreen) {
                container.webkitRequestFullscreen();
            } else if (container.mozRequestFullScreen) {
                container.mozRequestFullScreen();
            } else if (container.msRequestFullscreen) {
                container.msRequestFullscreen();
            }
        } else {
            // Exiting fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
        setIsFullscreen(!isFullscreen);
    };

    // Listen for fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            const isCurrentlyFullscreen = !!(
                document.fullscreenElement ||
                document.webkitFullscreenElement ||
                document.mozFullScreenElement ||
                document.msFullscreenElement
            );
            setIsFullscreen(isCurrentlyFullscreen);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
        };
    }, []);

    const download = () => {
        const a = document.createElement("a");
        a.href = src;
        a.download = `${(title || "plot").replace(/\s+/g, "_")}.png`;
        a.click();
    };

    // Close if clicking the backdrop
    const closeOnBackdrop = (e) => {
        if (e.target === backdropRef.current) onClose();
    };

    // Wheel zoom
    const onWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(baseScale, Math.min(5, scale * delta)); // Use baseScale as minimum

        const rect = frameRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        setTx(tx - x * (newScale / scale - 1));
        setTy(ty - y * (newScale / scale - 1));
        setScale(newScale);
    };

    // Drag to pan
    const onMouseDown = (e) => {
        if (e.button !== 0) return; // Only left click
        e.preventDefault();
        setDrag({ x: e.clientX - tx, y: e.clientY - ty });
    };

    const onMouseMove = (e) => {
        if (!drag) return;
        setTx(e.clientX - drag.x);
        setTy(e.clientY - drag.y);
    };

    const endDrag = () => setDrag(null);

    return (
        <div
            ref={backdropRef}
            className="pm-backdrop"
            onClick={closeOnBackdrop}
            onMouseMove={onMouseMove}
            onMouseUp={endDrag}
            onMouseLeave={endDrag}
            role="dialog"
            aria-modal="true"
            aria-label={`${title} visualization`}
        >
            <div className={`pm-container ${isFullscreen ? 'pm-fullscreen' : ''}`}>
                {/* Glassmorphic Header */}
                <div className="pm-header">
                    <div className="pm-header-left">
                        <div className="pm-title-group">
                            <div className="pm-title-badge">VISUALIZATION</div>
                            <h2 className="pm-title">{title}</h2>
                        </div>
                    </div>

                    <div className="pm-controls">
                        {/* Zoom indicator */}
                        <div className="pm-zoom-indicator">
                            <span className="pm-zoom-value">{Math.round(scale * 100)}%</span>
                        </div>

                        {/* Control buttons */}
                        <div className="pm-button-group">
                            <button className="pm-btn" onClick={zoomOut} title="Zoom Out (-)">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                                    <path d="M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                            </button>
                            <button className="pm-btn" onClick={zoomIn} title="Zoom In (+)">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                                    <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                            </button>
                            <button className="pm-btn" onClick={refit} title="Reset View (R)">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M21 3v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M3 21v-5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                            <button className="pm-btn" onClick={toggleFullscreen} title="Fullscreen (F)">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    {isFullscreen ? (
                                        <path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3"
                                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    ) : (
                                        <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"
                                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    )}
                                </svg>
                            </button>
                            <button className="pm-btn pm-btn-primary" onClick={download} title="Download">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 3v12m0 0l4-4m-4 4l-4-4M3 17v2a2 2 0 002 2h14a2 2 0 002-2v-2"
                                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                            <button className="pm-btn pm-btn-close" onClick={onClose} title="Close (Esc)">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Image Frame */}
                <div
                    ref={frameRef}
                    className="pm-frame"
                    onWheel={onWheel}
                    onMouseDown={onMouseDown}
                    style={{ cursor: drag ? 'grabbing' : scale > 1 ? 'grab' : 'default' }}
                >
                    <img
                        ref={imgRef}
                        src={src}
                        alt={title}
                        className="pm-image"
                        style={{
                            transform: `translate(-50%, -50%) translate(${tx}px, ${ty}px) scale(${scale})`,
                        }}
                        draggable={false}
                    />
                </div>

                {/* Status Bar */}
                <div className="pm-statusbar">
                    <div className="pm-status-left">
                        <span className="pm-status-indicator"></span>
                        <span className="pm-status-text">Interactive Mode</span>
                    </div>
                    <div className="pm-status-center">
                        <span className="pm-hint">Scroll to zoom • Drag to pan • Double-click to reset</span>
                    </div>
                    <div className="pm-status-right">
                        <span className="pm-shortcut">ESC</span> to close
                    </div>
                </div>
            </div>
        </div>
    );
}