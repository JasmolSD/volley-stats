// App.jsx
import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Results from "./pages/Results.jsx";
import './app.css';

export default function App() {
    const [token, setToken] = useState();
    const [summary, setSummary] = useState();

    // NEW: cumulative | temporal
    const [mode, setMode] = useState("cumulative");

    return (
        <BrowserRouter>
            <Routes>
                <Route
                    path="/"
                    element={<Home setToken={setToken} setSummary={setSummary} />}
                />
                <Route
                    path="/results"
                    element={
                        <Results
                            token={token}
                            summary={summary}
                            mode={mode}
                            setMode={setMode}
                        />
                    }
                />
            </Routes>
        </BrowserRouter>
    );
}
