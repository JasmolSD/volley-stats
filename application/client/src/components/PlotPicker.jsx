const KINDS = [
    { value: "offense", label: "Offense" },
    { value: "receive", label: "Receive" },
    { value: "service", label: "Service" },
    { value: "errors", label: "Errors (temporal)" },
    { value: "atk_acc_over_time", label: "Atk % Over Time (temporal)" },
    { value: "avg_errors_over_time", label: "Avg Errors Over Time (temporal)" },
    { value: "assists", label: "Assists per Set Over Time (temporal)" }
];

export default function PlotPicker({ kind, onChange }) {
    return (
        <select value={kind} onChange={e => onChange(e.target.value)}>
            {KINDS.map(k => (
                <option key={k.value} value={k.value}>{k.label}</option>
            ))}
        </select>
    );
}
