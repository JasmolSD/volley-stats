// components/PlotCard.jsx
import { useState } from "react";

export default function PlotCard({ title, badge, imageSrc, onClick }) {
    const [imageError, setImageError] = useState(false);

    return (
        <div className="plot-card" onClick={onClick} style={{ cursor: 'zoom-in' }}>
            <div className="plot-header">
                <span className="plot-title">{title}</span>
                <span className="plot-badge">{badge}</span>
            </div>
            {!imageError && imageSrc ? (
                <img
                    src={imageSrc}
                    alt={title}
                    className="plot-image"
                    onError={(e) => {
                        console.error(`Failed to load image for ${title}`);
                        setImageError(true);
                    }}
                    // Allow native right-click context menu
                    onContextMenu={(e) => e.stopPropagation()}
                />
            ) : (
                <div style={{
                    width: '100%',
                    height: '300px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(255, 255, 255, 0.02)',
                    color: 'var(--text-muted)'
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: 'var(--space-sm)', opacity: 0.3 }}>
                            📈
                        </div>
                        <div style={{ fontSize: 'var(--text-sm)' }}>
                            Visualization Loading...
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}