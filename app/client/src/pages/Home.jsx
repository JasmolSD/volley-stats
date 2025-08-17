// pages/Home.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import FileUpload from "../components/FileUpload.jsx";
import { uploadFile } from "../api.js";
import LoadingOverlay from "../components/LoadingOverlay.jsx"; // <— overlay with spinner

export default function Home({ setToken, setSummary }) {
    const navigate = useNavigate();
    const [uploading, setUploading] = useState(false);

    async function handleUpload(file) {
        setUploading(true);
        try {
            const res = await uploadFile(file);
            // Backend may return { run_id, summary, ... } or { token, ... }
            const token = res.run_id ?? res.token;
            setToken(token);
            setSummary(res.summary);
            navigate("/results");
        } catch (err) {
            console.error(err);
            alert("Upload or analysis failed. Please try again with a valid CSV/XLSX.");
        } finally {
            setUploading(false);
        }
    }

    return (
        <>
            <LoadingOverlay show={uploading} message="Processing your stats…" />
            <div style={{ maxWidth: 800, margin: "40px auto" }}>
                <h1>Volley Stats</h1>
                <p>Upload a CSV/XLSX file to analyze your volleyball performance.</p>
                {/* If FileUpload supports a disabled/busy prop, pass it down */}
                <FileUpload onUpload={handleUpload} disabled={uploading} />
            </div>
        </>
    );
}
