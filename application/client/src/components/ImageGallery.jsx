// components/ImageGallery.jsx
import { useEffect, useState } from "react";
import { getPlot } from "../api.js";
import SmallSpinner from "./SmallSpinner.jsx";
import PlotModal from "./PlotModal.jsx"; // NEW

const LABELS = {
    offense: "Offense",
    service: "Service",
    receive: "Receive",
    errors: "Errors (Temporal)",
    atk_acc_over_time: "Attack % Over Time",
    avg_errors_over_time: "Avg Errors Over Time",
};

function toDataUrl(s) {
    if (!s) return "";
    return s.startsWith("data:image") ? s : `data:image/png;base64,${s}`;
}

export default function ImageGallery({ token, player, kinds, mode = "cumulative" }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);

    // NEW: modal state
    const [active, setActive] = useState(null); // { kind, image } | null

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setErr(null);
            try {
                const out = [];
                for (const kind of kinds) {
                    const { image } = await getPlot(token, kind, player, mode);
                    if (cancelled) return;
                    out.push({ kind, image: toDataUrl(image) });
                }
                if (!cancelled) setItems(out);
            } catch (e) {
                if (!cancelled) setErr(String(e?.message || e));
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [token, player, kinds, mode]);

    if (loading) {
        return (
            <div style={{ display: "grid", placeItems: "center", minHeight: 240 }}>
                <SmallSpinner label="Rendering plots…" />
            </div>
        );
    }

    if (err) {
        return <div style={{ color: "salmon" }}>Failed to load plots: {err}</div>;
    }

    return (
        <>
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
                    gap: 18,
                }}
            >
                {items.map(({ kind, image }) => (
                    <figure key={kind} style={styles.card}>
                        {/* Gorgeous header */}
                        <figcaption style={styles.caption}>
                            <div style={styles.capLeft}>
                                <span style={styles.badge}>{mode === "temporal" ? "Temporal" : "Cumulative"}</span>
                                <span style={styles.titleText}>{LABELS[kind] ?? kind}</span>
                            </div>
                            <button
                                onClick={() => setActive({ kind, image, title: LABELS[kind] ?? kind })}
                                style={styles.viewBtn}
                                aria-label="View larger"
                                title="View larger"
                            >
                                ⤢
                            </button>
                        </figcaption>

                        <button
                            onClick={() => setActive({ kind, image, title: LABELS[kind] ?? kind })}
                            style={styles.imgButton}
                            aria-label={`Open ${LABELS[kind] ?? kind}`}
                            title="Click to enlarge"
                        >
                            <img src={image} alt={LABELS[kind] ?? kind} style={styles.img} />
                        </button>
                    </figure>
                ))}
            </div>

            {/* Lightbox modal */}
            {active && (
                <PlotModal
                    title={active.title}
                    src={active.image}
                    onClose={() => setActive(null)}
                />
            )}
        </>
    );
}

const styles = {
    card: {
        margin: 0,
        background: "#fff",
        border: "1px solid #e7e7e7",
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 6px 18px rgba(0,0,0,0.05)"
    },
    caption: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 12px",
        background: "linear-gradient(180deg,#fafafa,#f3f3f3)",
        borderBottom: "1px solid #ececec"
    },
    capLeft: { display: "flex", alignItems: "center", gap: 8 },
    badge: {
        fontSize: 11,
        fontWeight: 700,
        padding: "2px 8px",
        borderRadius: 999,
        background: "#eef2ff",
        color: "#334155",
        border: "1px solid #dbeafe",
    },
    titleText: {
        fontWeight: 700,
        fontSize: 14,
        color: "#111",
        letterSpacing: 0.2
    },
    viewBtn: {
        border: "1px solid #d0d0d0",
        background: "#fff",
        borderRadius: 8,
        padding: "4px 8px",
        cursor: "pointer",
        fontSize: 14,
        lineHeight: 1
    },
    imgButton: {
        display: "block",
        width: "100%",
        padding: 0,
        border: 0,
        background: "#f8f9fb",
        cursor: "zoom-in"
    },
    img: { width: "100%", display: "block" }
};
