// components/ModeToggle.jsx
import React from "react";

export default function ModeToggle({ mode, onChange }) {
    const options = ["cumulative", "temporal"];

    return (
        <div style={styles.wrap} role="tablist" aria-label="Plot mode">
            {options.map((m, i) => {
                const active = mode === m;
                return (
                    <button
                        key={m}
                        role="tab"
                        aria-selected={active}
                        onClick={() => onChange(m)}
                        style={{
                            ...styles.btn,
                            ...(active ? styles.btnActive : styles.btnInactive),
                            borderRightWidth: i === options.length - 1 ? 0 : 1
                        }}
                    >
                        {m.charAt(0).toUpperCase() + m.slice(1)}
                    </button>
                );
            })}
        </div>
    );
}

const styles = {
    wrap: {
        display: "inline-flex",
        border: "1px solid #333",
        borderRadius: 999,
        overflow: "hidden",
    },
    btn: {
        padding: "8px 16px",
        fontWeight: 600,
        border: 0,
        borderRight: "1px solid #333",
        cursor: "pointer",
        userSelect: "none",
        outline: "none",
    },
    btnActive: {
        background: "#111",
        color: "#fff",
    },
    btnInactive: {
        background: "#fff",
        color: "#111",           // ← black text on white
    },
};
