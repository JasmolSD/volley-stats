// Base URL for API requests
// Uses environment variable VITE_API_URL if defined, otherwise falls back to localhost:5001
const BASE = import.meta.env.VITE_API_URL || "http://localhost:5001";

// Upload a file to the server
export async function uploadFile(file) {
    const fd = new FormData();
    fd.append("file", file); // attach the file to the form data
    const r = await fetch(`${BASE}/api/upload`, { method: "POST", body: fd });
    if (!r.ok) throw new Error("Upload failed"); // throw if server response not ok
    return r.json(); // parse and return JSON response
}

// Resolve player name against database (handles fuzzy matches / corrections)
export async function resolvePlayer(token, q) {
    // NOTE: variable "API" is referenced but not defined; likely should be "BASE"
    const u = new URL(`${BASE}/api/players`);
    u.searchParams.set("token", token);  // attach token as query param
    u.searchParams.set("q", q ?? "");    // attach player query (or empty string)
    const res = await fetch(u);
    if (!res.ok) throw new Error("resolvePlayer failed");
    return res.json(); // expected format: { players: [...], resolved: {...} }
}

// Fetch all players available for given token
export async function getPlayers(token) {
    const r = await fetch(`${BASE}/api/players?token=${encodeURIComponent(token)}`);
    if (!r.ok) throw new Error("Players fetch failed");
    return r.json();
}

// Fetch plot data for a given player or general stat kind
export async function getPlot(token, kind, player, mode = "cumulative") {
    const u = new URL(`${BASE}/api/plot`);
    u.searchParams.set("token", token);
    u.searchParams.set("kind", kind);
    if (player) u.searchParams.set("player", player);
    u.searchParams.set("mode", mode); // NEW
    const r = await fetch(u);
    if (!r.ok) throw new Error("Plot fetch failed");
    return r.json(); // { image: "data:image/png;base64,..." }
}

// Get AI-generated commentary for a player’s performance
export async function getCommentary(token, player) {
    const r = await fetch(`${BASE}/api/commentary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, player }) // send token + player in request body
    });
    if (!r.ok) throw new Error("Commentary fetch failed");
    return r.json();
}
