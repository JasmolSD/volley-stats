// components/ModeToggle.jsx

export default function ModeToggle({ mode, onChange }) {
    return (
        <div className="mode-toggle">
            <div className={`mode-toggle-indicator ${mode === 'temporal' ? 'temporal' : ''}`}></div>
            <button
                className={`mode-toggle-btn ${mode === 'cumulative' ? 'active' : ''}`}
                onClick={() => onChange('cumulative')}
            >
                Cumulative
            </button>
            <button
                className={`mode-toggle-btn ${mode === 'temporal' ? 'active' : ''}`}
                onClick={() => onChange('temporal')}
            >
                Temporal
            </button>
        </div>
    );
}