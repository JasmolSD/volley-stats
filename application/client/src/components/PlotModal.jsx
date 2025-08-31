// components/PlotModal.jsx
import { useEffect, useRef, useState } from "react";
import "./PlotModal.css";

export default function PlotModal({ title, src, onClose }) {
    const backdropRef = useRef(null);
    const frameRef = useRef(null);
    const imgRef = useRef(null);

    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [baseScale, setBaseScale] = useState(1);

    // Touch state
    const touchRef = useRef({
        initialDistance: 0,
        initialScale: 1,
        center: { x: 0, y: 0 },
        lastPos: { x: 0, y: 0 }
    });

    // Initialize and fit image
    useEffect(() => {
        const img = imgRef.current;
        const frame = frameRef.current;
        if (!img || !frame) return;

        const fitToFrame = () => {
            const fw = frame.clientWidth;
            const fh = frame.clientHeight;
            const iw = img.naturalWidth;
            const ih = img.naturalHeight;

            if (iw && ih && fw && fh) {
                const fitScale = Math.min(fw / iw, fh / ih) * 0.9;
                setScale(fitScale);
                setBaseScale(fitScale);
                setPosition({ x: 0, y: 0 });
            }
        };

        img.addEventListener("load", fitToFrame);
        fitToFrame();
        return () => img.removeEventListener("load", fitToFrame);
    }, [src]);

    // Update base scale on resize/fullscreen
    useEffect(() => {
        const updateBaseScale = () => {
            const img = imgRef.current;
            const frame = frameRef.current;
            if (!img || !frame) return;

            const fw = frame.clientWidth;
            const fh = frame.clientHeight;
            const iw = img.naturalWidth;
            const ih = img.naturalHeight;

            if (iw && ih && fw && fh) {
                const fitScale = Math.min(fw / iw, fh / ih) * 0.9;
                setBaseScale(fitScale);
            }
        };

        window.addEventListener('resize', updateBaseScale);
        updateBaseScale();
        return () => window.removeEventListener('resize', updateBaseScale);
    }, [isFullscreen]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeydown = (e) => {
            switch (e.key.toLowerCase()) {
                case 'escape': onClose(); break;
                case '+':
                case '=': zoomIn(); break;
                case '-':
                case '_': zoomOut(); break;
                case 'r': resetView(); break;
                case 'f': toggleFullscreen(); break;
                case 'c': copyImage(); break;
                case 'd': download(); break;
            }
        };

        window.addEventListener("keydown", handleKeydown);
        return () => window.removeEventListener("keydown", handleKeydown);
    }, [scale, baseScale]);

    // Zoom functions
    const zoomIn = () => setScale(s => Math.min(s * 1.2, 5));
    const zoomOut = () => setScale(s => Math.max(s * 0.8, baseScale));

    const resetView = () => {
        const img = imgRef.current;
        const frame = frameRef.current;
        if (!img || !frame) return;

        const fw = frame.clientWidth;
        const fh = frame.clientHeight;
        const iw = img.naturalWidth;
        const ih = img.naturalHeight;
        const fitScale = Math.min(fw / iw, fh / ih) * 0.9;

        setScale(fitScale);
        setBaseScale(fitScale);
        setPosition({ x: 0, y: 0 });
    };

    // Fullscreen toggle
    const toggleFullscreen = () => {
        const container = document.querySelector('.pm-container');

        if (!document.fullscreenElement) {
            container.requestFullscreen?.() ||
                container.webkitRequestFullscreen?.() ||
                container.mozRequestFullScreen?.() ||
                container.msRequestFullscreen?.();
        } else {
            document.exitFullscreen?.() ||
                document.webkitExitFullscreen?.() ||
                document.mozCancelFullScreen?.() ||
                document.msExitFullscreen?.();
        }
    };

    // Listen for fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        const events = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange'];
        events.forEach(e => document.addEventListener(e, handleFullscreenChange));

        return () => {
            events.forEach(e => document.removeEventListener(e, handleFullscreenChange));
        };
    }, []);

    // Download image
    const download = () => {
        const a = document.createElement("a");
        a.href = src;
        a.download = `${(title || "plot").replace(/\s+/g, "_")}.png`;
        a.click();
    };

    // Copy image to clipboard
    const copyImage = async () => {
        try {
            let blob;

            if (src.startsWith('data:image')) {
                const base64Data = src.replace(/^data:image\/\w+;base64,/, '');
                const byteCharacters = atob(base64Data);
                const byteArray = new Uint8Array(byteCharacters.length);

                for (let i = 0; i < byteCharacters.length; i++) {
                    byteArray[i] = byteCharacters.charCodeAt(i);
                }

                blob = new Blob([byteArray], { type: 'image/png' });
            } else {
                const response = await fetch(src);
                blob = await response.blob();
            }

            await navigator.clipboard.write([
                new window.ClipboardItem({ [blob.type]: blob })
            ]);

            showNotification('✓ Image copied to clipboard!');
        } catch (error) {
            console.error('Failed to copy:', error);
            alert('Failed to copy image. Please try downloading instead.');
        }
    };

    // Show notification
    const showNotification = (message) => {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
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
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2500);
    };

    // MOUSE EVENTS
    const handleWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(baseScale, Math.min(5, scale * delta));

        const rect = frameRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        setPosition(prev => ({
            x: prev.x - x * (newScale / scale - 1),
            y: prev.y - y * (newScale / scale - 1)
        }));
        setScale(newScale);
    };

    const handleMouseDown = (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        setIsDragging(true);
        touchRef.current.lastPos = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        setPosition({
            x: e.clientX - touchRef.current.lastPos.x,
            y: e.clientY - touchRef.current.lastPos.y
        });
    };

    const handleMouseUp = () => setIsDragging(false);

    // TOUCH EVENTS
    const getTouchDistance = (touches) => {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    };

    const getTouchCenter = (touches) => ({
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2
    });

    const handleTouchStart = (e) => {
        const touches = e.touches;

        if (touches.length === 1) {
            // Single finger - pan
            touchRef.current.lastPos = {
                x: touches[0].clientX - position.x,
                y: touches[0].clientY - position.y
            };
            setIsDragging(true);
        } else if (touches.length === 2) {
            // Two fingers - pinch zoom
            e.preventDefault();
            touchRef.current.initialDistance = getTouchDistance(touches);
            touchRef.current.initialScale = scale;
            touchRef.current.center = getTouchCenter(touches);
            setIsDragging(false);
        }
    };

    const handleTouchMove = (e) => {
        const touches = e.touches;

        if (touches.length === 1 && isDragging) {
            // Single finger pan
            e.preventDefault();
            setPosition({
                x: touches[0].clientX - touchRef.current.lastPos.x,
                y: touches[0].clientY - touchRef.current.lastPos.y
            });
        } else if (touches.length === 2) {
            // Pinch zoom
            e.preventDefault();
            const currentDistance = getTouchDistance(touches);
            const currentCenter = getTouchCenter(touches);

            // Calculate new scale
            const scaleChange = currentDistance / touchRef.current.initialDistance;
            const newScale = Math.max(
                baseScale,
                Math.min(5, touchRef.current.initialScale * scaleChange)
            );

            // Calculate position adjustment for zoom center
            const rect = frameRef.current.getBoundingClientRect();
            const centerX = currentCenter.x - rect.left - rect.width / 2;
            const centerY = currentCenter.y - rect.top - rect.height / 2;

            // Update scale and position
            setScale(newScale);

            // Adjust position to zoom from touch center
            const scaleDiff = newScale / touchRef.current.initialScale;
            setPosition(prev => ({
                x: prev.x + (currentCenter.x - touchRef.current.center.x),
                y: prev.y + (currentCenter.y - touchRef.current.center.y)
            }));
        }
    };

    const handleTouchEnd = (e) => {
        if (e.touches.length === 0) {
            setIsDragging(false);
        } else if (e.touches.length === 1) {
            // Switch from pinch to pan
            touchRef.current.lastPos = {
                x: e.touches[0].clientX - position.x,
                y: e.touches[0].clientY - position.y
            };
            setIsDragging(true);
        }
    };

    // Prevent body scroll when modal is open
    useEffect(() => {
        const originalOverflow = document.body.style.overflow;
        const originalTouchAction = document.body.style.touchAction;

        document.body.style.overflow = 'hidden';
        document.body.style.touchAction = 'none';

        return () => {
            document.body.style.overflow = originalOverflow;
            document.body.style.touchAction = originalTouchAction;
        };
    }, []);

    // Close on backdrop click
    const handleBackdropClick = (e) => {
        if (e.target === backdropRef.current) onClose();
    };

    return (
        <div
            ref={backdropRef}
            className="pm-backdrop"
            onClick={handleBackdropClick}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            role="dialog"
            aria-modal="true"
            aria-label={`${title} visualization`}
        >
            <div className={`pm-container ${isFullscreen ? 'pm-fullscreen' : ''}`}>
                <div className="pm-header">
                    <div className="pm-header-left">
                        <div className="pm-title-group">
                            <div className="pm-title-badge">VISUALIZATION</div>
                            <h2 className="pm-title">{title}</h2>
                        </div>
                    </div>

                    <div className="pm-controls">
                        <div className="pm-zoom-indicator">
                            <span className="pm-zoom-value">{Math.round(scale * 100)}%</span>
                        </div>

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
                            <button className="pm-btn pm-btn-reset" onClick={resetView} title="Reset View (R)">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M21 3v5h-5M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16M3 21v-5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

                <div
                    ref={frameRef}
                    className="pm-frame"
                    onWheel={handleWheel}
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                    onDoubleClick={resetView}
                    style={{
                        cursor: isDragging ? 'grabbing' : scale > 1 ? 'grab' : 'default',
                        touchAction: 'none'
                    }}
                >
                    <img
                        ref={imgRef}
                        src={src}
                        alt={title}
                        className="pm-image"
                        style={{
                            transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        }}
                        draggable={false}
                    />
                </div>

                <div className="pm-statusbar">
                    <div className="pm-status-left">
                        <span className="pm-status-indicator"></span>
                        <span className="pm-status-text">Interactive Mode</span>
                    </div>
                    <div className="pm-status-center">
                        <span className="pm-hint">
                            {window.matchMedia('(hover: hover)').matches
                                ? 'Scroll to zoom • Drag to pan • Press C to copy • Press D to download'
                                : 'Pinch to zoom • Drag to pan • Tap buttons for actions'
                            }
                        </span>
                    </div>
                    <div className="pm-status-right">
                        <span className="pm-shortcut">ESC</span> to close
                    </div>
                </div>
            </div>
        </div>
    );
}