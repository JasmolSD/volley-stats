import React, { useEffect, useRef, useState } from "react";
import "./PlotModal.css";

export default function PlotModal({ title, src, onClose }) {
    const backdropRef = useRef(null);
    const stageRef = useRef(null);
    const canvasRef = useRef(null);  // outer container (rounded, shadow)
    const frameRef = useRef(null);   // visible plot area (above the HUD)
    const imgRef = useRef(null);

    const [scale, setScale] = useState(1);
    const [tx, setTx] = useState(0);
    const [ty, setTy] = useState(0);
    const [drag, setDrag] = useState(null);

    // Fit-to-frame when the image loads (fit inside the visible plot frame, not the HUD)
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
                const fitScale = Math.min(fw / iw, fh / ih);
                setScale(fitScale);
                setTx(0);
                setTy(0);
            }
        };

        img.addEventListener("load", handleLoad);
        return () => img.removeEventListener("load", handleLoad);
    }, [src]);

    // Keyboard shortcuts
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "+") setScale((s) => clamp(s + 0.2, 0.2, 6));
            if (e.key === "-") setScale((s) => clamp(s - 0.2, 0.2, 6));
            if (e.key.toLowerCase() === "r") refit();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    const refit = () => {
        const img = imgRef.current;
        const frame = frameRef.current;
        if (img && frame) {
            const fw = frame.clientWidth;
            const fh = frame.clientHeight;
            const iw = img.naturalWidth;
            const ih = img.naturalHeight;
            const fitScale = Math.min(fw / iw, fh / ih);
            setScale(fitScale);
        } else {
            setScale(1);
        }
        setTx(0);
        setTy(0);
    };

    // Close if clicking the dark backdrop
    const closeOnBackdrop = (e) => {
        if (e.target === backdropRef.current) onClose();
    };

    // Wheel zoom (towards cursor) using the visible frame bounds
    const onWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const next = clamp(scale + delta, 0.2, 6);

        const rect = frameRef.current.getBoundingClientRect();
        const cx = e.clientX - rect.left - rect.width / 2 - tx;
        const cy = e.clientY - rect.top - rect.height / 2 - ty;
        const factor = next / scale;

        setTx(tx - cx * (factor - 1));
        setTy(ty - cy * (factor - 1));
        setScale(next);
    };

    // Drag to pan (inside the bounded frame)
    const onMouseDown = (e) => {
        e.preventDefault();
        setDrag({ x: e.clientX, y: e.clientY });
        stageRef.current.classList.add("is-dragging");
    };
    const onMouseMove = (e) => {
        if (!drag) return;
        setTx((v) => v + (e.clientX - drag.x));
        setTy((v) => v + (e.clientY - drag.y));
        setDrag({ x: e.clientX, y: e.clientY });
    };
    const endDrag = () => {
        setDrag(null);
        stageRef.current?.classList.remove("is-dragging");
    };

    const download = () => {
        const a = document.createElement("a");
        a.href = src;
        a.download = `${(title || "plot").replace(/\s+/g, "_")}.png`;
        a.click();
    };

    return (
        <div
            ref={backdropRef}
            className="pm-backdrop"
            onClick={closeOnBackdrop}
            role="dialog"
            aria-modal="true"
            aria-label={`${title} (enlarged view)`}
        >
            <div className="pm-container" onClick={(e) => e.stopPropagation()}>
                {/* Glass toolbar */}
                <div className="pm-toolbar">
                    <div className="pm-titlewrap">
                        <div className="pm-kicker" aria-hidden>Plot</div>
                        <div className="pm-title" title={title}>{title}</div>
                    </div>

                    {/* Control bar */}
                    <div className="pm-controlBar" tabIndex={-1}>
                        <IconButton label="Zoom out (−)" onClick={() => setScale((s) => clamp(s - 0.2, 0.2, 6))}>
                            <IconMinus />
                        </IconButton>
                        <IconButton label="Zoom in (+)" onClick={() => setScale((s) => clamp(s + 0.2, 0.2, 6))}>
                            <IconPlus />
                        </IconButton>
                        <IconButton label="Fit (R)" onClick={refit}>
                            <IconReset />
                        </IconButton>
                        <IconButton label="Download" onClick={download} primary>
                            <IconDownload />
                        </IconButton>
                        <IconButton label="Close (Esc)" onClick={onClose} danger>
                            <IconClose />
                        </IconButton>
                    </div>
                </div>

                {/* Stage centers the bounded canvas */}
                <div
                    ref={stageRef}
                    className="pm-stage"
                    onWheel={onWheel}
                    onMouseDown={onMouseDown}
                    onMouseMove={onMouseMove}
                    onMouseUp={endDrag}
                    onMouseLeave={endDrag}
                >
                    {/* Bounded canvas (rounded, shadow); inside it, frame + HUD */}
                    <div ref={canvasRef} className="pm-canvas">
                        {/* Visible plot frame (everything above the HUD) */}
                        <div ref={frameRef} className="pm-frame">
                            <img
                                ref={imgRef}
                                src={src}
                                alt={title}
                                className="pm-img"
                                style={{
                                    transform: `translate(-50%, -50%) translate(${tx}px, ${ty}px) scale(${scale})`,
                                }}
                                draggable={false}
                            />
                        </div>

                        {/* Full-width HUD, attached flush to the bottom, metallic blue */}
                        <div className="pm-hud" role="status" aria-live="polite">
                            <div className="pm-hudContent">
                                <div className="pm-hudLeft">
                                    <span className="pm-dot" aria-hidden="true"></span>
                                    <span className="pm-chip">Zoom</span>
                                    <strong>{Math.round(scale * 100)}%</strong>
                                </div>
                                <div className="pm-hudRight pm-hint">
                                    Scroll to zoom • Drag to pan • Esc to close
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ---------- Icon Button + Icons ---------- */

function IconButton({ children, label, onClick, danger, primary }) {
    const cls = `pm-iconBtn ${danger ? "pm-iconBtn--danger" : ""} ${primary ? "pm-iconBtn--primary" : ""}`;
    return (
        <button className={cls} onClick={onClick} aria-label={label} title={label}>
            {children}
        </button>
    );
}

function IconPlus() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" className="pm-icon">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}
function IconMinus() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" className="pm-icon">
            <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}
function IconReset() {
    // modern circular refresh arrow
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" className="pm-icon">
            <path d="M20 12a8 8 0 1 1-2.343-5.657" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M20 4v4h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}
function IconDownload() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" className="pm-icon">
            <path d="M12 3v10m0 0l4-4m-4 4l-4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M5 21h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}
function IconClose() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" className="pm-icon">
            <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
