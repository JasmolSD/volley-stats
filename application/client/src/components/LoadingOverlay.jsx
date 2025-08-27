import React from "react";

export default function LoadingOverlay({ show, message = "Processing your stats…" }) {
    if (!show) return null;
    return (
        <div style={styles.backdrop} role="alert" aria-busy="true" aria-live="polite">
            <div style={styles.card}>
                <svg
                    width="56" height="56" viewBox="0 0 50 50"
                    style={{ marginBottom: 12 }}
                    aria-hidden="true"
                >
                    <circle
                        cx="25" cy="25" r="20"
                        fill="none" strokeWidth="5" stroke="#e0e0e0"
                    />
                    <circle
                        cx="25" cy="25" r="20"
                        fill="none" strokeWidth="5" stroke="#5b9bd5" strokeLinecap="round"
                        strokeDasharray="90 150"
                    >
                        <animateTransform
                            attributeName="transform"
                            type="rotate"
                            from="0 25 25"
                            to="360 25 25"
                            dur="0.9s"
                            repeatCount="indefinite"
                        />
                    </circle>
                </svg>
                <div style={styles.text}>{message}</div>
                <div style={styles.subtext}>Hang tight while we crunch the numbers.</div>
            </div>
        </div>
    );
}

const styles = {
    backdrop: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "grid",
        placeItems: "center",
        zIndex: 9999
    },
    card: {
        background: "#121212",
        color: "#f1f1f1",
        padding: "18px 22px",
        borderRadius: 12,
        boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
        minWidth: 280,
        textAlign: "center",
        border: "1px solid #2a2a2a"
    },
    text: { fontSize: 16, fontWeight: 600 },
    subtext: { fontSize: 12, opacity: 0.8, marginTop: 4 }
};
