// components/SmallSpinner.jsx

export default function SmallSpinner({ label = "Loading…" }) {
    return (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <svg width="20" height="20" viewBox="0 0 50 50" aria-hidden="true">
                <circle cx="25" cy="25" r="20" fill="none" strokeWidth="5" stroke="#e0e0e0" />
                <circle cx="25" cy="25" r="20" fill="none" strokeWidth="5" stroke="#5b9bd5" strokeLinecap="round" strokeDasharray="90 150">
                    <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="0.9s" repeatCount="indefinite" />
                </circle>
            </svg>
            <span>{label}</span>
        </div>
    );
}
