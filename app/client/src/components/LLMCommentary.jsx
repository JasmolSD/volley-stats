import { useEffect, useState } from "react";
import { getCommentary } from "../api";

export default function Commentary({ token, player }) {
    const [text, setText] = useState("");
    const [requests, setRequests] = useState([]);

    useEffect(() => {
        if (!token) return;
        (async () => {
            const res = await getCommentary(token, player);
            setText(res.commentary || "");
            setRequests(res.requests || []);
        })();
    }, [token, player]);

    return (
        <div style={{ marginTop: 24, padding: 16, border: "1px solid #eee", borderRadius: 12 }}>
            <h3>Analyst Commentary</h3>
            <p style={{ whiteSpace: "pre-wrap" }}>{text}</p>
            {requests.length > 0 && (
                <div style={{ marginTop: 8 }}>
                    <small>Follow-up suggestions:&nbsp;
                        {requests.map((r, i) =>
                            <code key={i} style={{ marginRight: 8 }}>{JSON.stringify(r)}</code>
                        )}
                    </small>
                </div>
            )}
        </div>
    );
}
