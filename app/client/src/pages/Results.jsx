// pages/Results.jsx
import { useEffect, useMemo, useState } from "react";
import { getPlayers, resolvePlayer } from "../api.js";
import SummaryCards from "../components/SummaryCards.jsx";
import PlotGallery from "../components/ImageGallery.jsx";
import Commentary from "../components/LLMCommentary.jsx";
import ModeToggle from "../components/ModeToggle.jsx";
import SmallSpinner from "../components/SmallSpinner.jsx";

export default function Results({ token, summary }) {
    const [players, setPlayers] = useState([]);
    const [selectedPlayer, setSelectedPlayer] = useState("");
    const [loadingPlayers, setLoadingPlayers] = useState(false);
    const [mode, setMode] = useState("cumulative"); // "cumulative" | "temporal"

    useEffect(() => {
        if (!token) return;
        (async () => {
            try {
                setLoadingPlayers(true);
                const p = await getPlayers(token);
                setPlayers(p.players || []);
            } finally {
                setLoadingPlayers(false);
            }
        })();
    }, [token]);

    const kinds = useMemo(() => {
        const base = ["offense", "service", "receive"];
        const temporalOnly = ["errors", "atk_acc_over_time", "avg_errors_over_time"];
        return mode === "temporal" ? [...base, ...temporalOnly] : base;
    }, [mode]);

    if (!token) {
        return (
            <div className="container page">
                <div className="card card--glass">
                    <div className="card__in">
                        <h2 style={{ margin: 0 }}>No results yet</h2>
                        <p className="page-subtle" style={{ marginTop: 6 }}>
                            Please upload a file on the Home page to see analysis here.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const modeChip =
        mode === "cumulative"
            ? "Rolled-up season stats"
            : "Per-week trendlines";

    return (
        <div className="container page">
            {/* Page heading */}
            <div className="page-header">
                <div>
                    <h1>Results</h1>
                    <div className="page-header__hint">{modeChip}</div>
                </div>
                {/* Quick mode chip */}
                <div className="badge">{mode === "cumulative" ? "Cumulative" : "Temporal"}</div>
            </div>

            {/* Summary */}
            {summary && (
                <section className="section">
                    <div className="section__head">
                        <h2 className="section__title">Summary</h2>
                    </div>
                    <div className="card">
                        <div className="card__in">
                            <SummaryCards summary={summary} />
                        </div>
                    </div>
                </section>
            )}

            {/* Filters bar */}
            <section className="section">
                <div className="filters">
                    <div className="filters__left cluster">
                        <div className="field">
                            <label className="filters__label">Mode</label>
                            <ModeToggle mode={mode} onChange={setMode} />
                        </div>

                        <div className="field">
                            <label className="filters__label">Player</label>
                            <div className="inline">
                                <select
                                    className="filters__select"
                                    value={selectedPlayer}
                                    onChange={async (e) => {
                                        const raw = e.target.value;
                                        setSelectedPlayer(raw);
                                        if (!token) return;
                                        try {
                                            const r = await resolvePlayer(token, raw);
                                            const used = r?.resolved?.used_name ?? raw;
                                            if (used !== raw) setSelectedPlayer(used);
                                        } catch (err) {
                                            console.warn("resolvePlayer failed", err);
                                        }
                                    }}
                                >
                                    <option value="">(All / none)</option>
                                    {players.map((p) => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>

                                {loadingPlayers && <SmallSpinner />}
                            </div>
                        </div>
                    </div>

                    {/* Right side chips */}
                    <div className="filters__right cluster">
                        {selectedPlayer && (
                            <span className="chip">
                                Player: <strong>{selectedPlayer}</strong>
                            </span>
                        )}
                        <span className="chip chip--soft">{modeChip}</span>
                    </div>
                </div>
            </section>

            {/* Plots */}
            <section className="section">
                <div className="section__head">
                    <h2 className="section__title">Plots</h2>
                    <div className="section__hint">Click any plot to zoom</div>
                </div>

                <div className="card card--flush">
                    {/* The gallery itself renders images/cards; keep props the same */}
                    <PlotGallery
                        token={token}
                        player={selectedPlayer || undefined}
                        kinds={kinds}
                        mode={mode}
                    />
                </div>
            </section>

            {/* Commentary */}
            <section className="section">
                <div className="section__head">
                    <h2 className="section__title">AI Commentary</h2>
                    <div className="section__hint">Auto-generated insights</div>
                </div>
                <div className="commentary">
                    <Commentary token={token} player={selectedPlayer || undefined} />
                </div>
            </section>
        </div>
    );
}
