import React from "react";

export default function PlayerPicker({ players, value, onChange }) {
    return (
        <select value={value} onChange={e => onChange(e.target.value)}>
            <option value="">All Players</option>
            {players.map(p => (
                <option key={p} value={p}>{p}</option>
            ))}
        </select>
    );
}
