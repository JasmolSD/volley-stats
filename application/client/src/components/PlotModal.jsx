// components/PlotModal.jsx
import { useEffect, useRef, useState } from "react";
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

    // Detect website header height
    useEffect(() => {
        // Find the website header (adjust selector as needed for your site)
        const header = document.querySelector('.site-header, header, [class*="header"]');
        if (header) {
            const headerHeight = header.offsetHeight;
            const headerZIndex = window.getComputedStyle(header).zIndex;

            // Apply offset to the modal container
            const container = document.querySelector('.pm-container');
            if (container) {
                container.style.marginTop = `${headerHeight + 10}px`;
                container.style.maxHeight = `calc(100vh - ${headerHeight + 20}px)`;
            }
        }
    }, []);

    // Inject animation styles if not already present
    useEffect(() => {
        const styleId = 'plot-modal-animations';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                @keyframes fadeInOut {
                    0% {
                        opacity: 0;
                        transform: translate(-50%, -50%) scale(0.9);
                    }
                    20% {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1);
                    }
                    80% {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1);
                    }
                    100% {
                        opacity: 0;
                        transform: translate(-50%, -50%) scale(0.9);
                    }
                }
                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateX(-50%) translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0);
                    }
                }
                @keyframes slideUp {
                    from {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0);
                    }
                    to {
                        opacity: 0;
                        transform: translateX(-50%) translateY(-20px);
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }, []);

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
            if (e.key.toLowerCase() === "c") copyImage();
            if (e.key.toLowerCase() === "d") download();
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

    const copyImage = async () => {
        try {
            if (src && src.startsWith('data:image')) {
                // Convert base64 to blob
                const base64Data = src.replace(/^data:image\/\w+;base64,/, '');
                const byteCharacters = atob(base64Data);
                const byteNumbers = new Array(byteCharacters.length);

                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }

                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'image/png' });

                // Copy to clipboard
                if (navigator.clipboard && window.ClipboardItem) {
                    const clipboardItem = new window.ClipboardItem({
                        'image/png': blob
                    });
                    await navigator.clipboard.write([clipboardItem]);

                    // Show success feedback
                    showCopySuccess();
                } else {
                    throw new Error('Clipboard API not supported');
                }
            } else {
                // For regular URLs, fetch and copy
                const response = await fetch(src);
                const blob = await response.blob();
                const clipboardItem = new window.ClipboardItem({
                    [blob.type]: blob
                });
                await navigator.clipboard.write([clipboardItem]);
                showCopySuccess();
            }
        } catch (error) {
            console.error('Failed to copy image:', error);
            alert('Failed to copy image. Please try downloading instead.');
        }
    };

    const showCopySuccess = () => {
        const successMsg = document.createElement('div');
        successMsg.textContent = '✓ Image copied to clipboard!';
        successMsg.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #0ea5e9, #0284c7);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 14px;
            z-index: 100002;
            pointer-events: none;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            animation: slideDown 0.3s ease-out;
        `;
        document.body.appendChild(successMsg);

        setTimeout(() => {
            successMsg.style.animation = 'slideUp 0.3s ease-out';
            setTimeout(() => successMsg.remove(), 300);
        }, 2000);
    };

    // Close if clicking the backdrop
    const closeOnBackdrop = (e) => {
        // Ensure it works with touch events too
        if (e.target === backdropRef.current || e.target.classList.contains('pm-backdrop')) {
            onClose();
        }
    };

    // Wheel zoom
    const onWheel = (e) => {
        e.preventDefault();
        e.stopPropagation(); // Add this to stop event bubbling
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(baseScale, Math.min(5, scale * delta)); // Use baseScale as minimum

        const rect = frameRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        setTx(tx - x * (newScale / scale - 1));
        setTy(ty - y * (newScale / scale - 1));
        setScale(newScale);
    };

    // Prevent body scrolling when modal is open
    useEffect(() => {
        // Save original styles
        const originalOverflow = document.body.style.overflow;
        const originalHeight = document.documentElement.style.height;
        const originalOverflowHtml = document.documentElement.style.overflow;

        // Method 1: Just use overflow hidden (simplest, usually works)
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        document.documentElement.style.height = '100%';

        // Prevent wheel events from scrolling the page
        const preventWheel = (e) => {
            e.preventDefault();
        };

        // Prevent touch scrolling on mobile
        const preventTouch = (e) => {
            if (e.target.closest('.pm-backdrop')) {
                e.preventDefault();
            }
        };

        // Add listeners to the modal backdrop
        const backdrop = document.querySelector('.pm-backdrop');
        if (backdrop) {
            backdrop.addEventListener('wheel', preventWheel, { passive: false });
            backdrop.addEventListener('touchmove', preventTouch, { passive: false });
        }

        // Cleanup
        return () => {
            document.body.style.overflow = originalOverflow;
            document.documentElement.style.overflow = originalOverflowHtml;
            document.documentElement.style.height = originalHeight;

            if (backdrop) {
                backdrop.removeEventListener('wheel', preventWheel);
                backdrop.removeEventListener('touchmove', preventTouch);
            }
        };
    }, []);

    // Drag to pan
    const onMouseDown = (e) => {
        // Skip if right-click (allow context menu)
        if (e.button === 2) return;

        if (e.button !== 0) return; // Only left click for dragging
        e.preventDefault();
        setDrag({ x: e.clientX - tx, y: e.clientY - ty });
    };

    const onMouseMove = (e) => {
        if (!drag) return;
        setTx(e.clientX - drag.x);
        setTy(e.clientY - drag.y);
    };

    const endDrag = () => setDrag(null);

    // Handle right-click on image - removed the custom handler to allow default behavior
    // The copy button in the toolbar handles copying functionality reliably

    // Handle double-click to reset view
    const handleDoubleClick = (e) => {
        e.preventDefault();
        refit();
    };

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
                    <div className="pm-mobile-close-bar">
                        <button className="pm-mobile-close-btn" onClick={onClose}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                                    fill="currentColor" />
                            </svg>
                            <span>Close</span>
                        </button>
                    </div>
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
                            <button className="pm-btn pm-btn-zoom-out" onClick={zoomOut} title="Zoom Out (-)">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                                    <path d="M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                            </button>
                            <button className="pm-btn pm-btn-zoom-in" onClick={zoomIn} title="Zoom In (+)">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                                    <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                            </button>
                            <button className="pm-btn pm-btn-reset" onClick={refit} title="Reset View (R)">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M21 3v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M3 21v-5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                            <button className="pm-btn pm-btn-fullscreen" onClick={toggleFullscreen} title="Fullscreen (F)">
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
                            <button className="pm-btn pm-btn-primary pm-btn-copy" onClick={copyImage} title="Copy Image (C)">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2" />
                                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2" />
                                </svg>
                            </button>
                            <button className="pm-btn pm-btn-primary pm-btn-download" onClick={download} title="Download (D)">
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
                    onDoubleClick={handleDoubleClick}
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
                        <span className="pm-hint">Scroll to zoom • Drag to pan • Press C to copy • Press D to download</span>
                    </div>
                    <div className="pm-status-right">
                        <span className="pm-shortcut">ESC</span> to close
                    </div>
                </div>
            </div>
        </div>
    );
}