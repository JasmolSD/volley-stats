export default function SummaryCards({ summary }) {
    const rows = summary?.rows ?? 0;
    const players = Array.isArray(summary?.players) ? summary.players.length : 0;
    const dateMin = summary?.date_min ?? "—";
    const dateMax = summary?.date_max ?? "—";

    const card = (title, value) => (
        <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 12 }}>
            <b>{title}</b>
            <div>{value}</div>
        </div>
    );

    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginTop: 16 }}>
            {card("Rows", rows)}
            {card("Players", players)}
            {card("Date Range", `${dateMin} → ${dateMax}`)}
        </div>
    );
}
