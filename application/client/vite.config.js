import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    server: {
        host: false,     // localhost only
        port: 5173,
        strictPort: true
    },
    preview: {
        port: 4173,
        strictPort: true
    }
});
