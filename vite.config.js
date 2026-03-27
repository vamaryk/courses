import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import tailwindcss from '@tailwindcss/vite';
// https://vitejs.dev/config/
export default defineConfig(function (_a) {
    var mode = _a.mode;
    // Load all env vars (including non-VITE_ ones like BACKEND_TARGET)
    var env = loadEnv(mode, process.cwd(), '');
    // For local dev: http://localhost:3002
    // For another PC: set BACKEND_TARGET=https://your-tunnel.trycloudflare.com in .env
    var backendTarget = env.BACKEND_TARGET || 'http://localhost:3002';
    return {
        plugins: [react(), tailwindcss(), tsconfigPaths()],
        // socket.io-client uses Node.js `global` — polyfill it for browser builds
        define: {
            global: 'globalThis',
        },
        server: {
            port: 5173,
            host: true,
            // `true` = any Host header (localhost, LAN, ngrok, etc.). String `'all'` is invalid in Vite 6.
            allowedHosts: true,
            proxy: {
                '/api': {
                    target: backendTarget,
                    changeOrigin: true,
                    secure: false,
                },
                '/socket.io': {
                    target: backendTarget,
                    changeOrigin: true,
                    secure: false,
                    ws: true,
                },
                '/course-media': {
                    target: backendTarget,
                    changeOrigin: true,
                    secure: false,
                },
                '/achievement-media': {
                    target: backendTarget,
                    changeOrigin: true,
                    secure: false,
                },
                '/chat-media': {
                    target: backendTarget,
                    changeOrigin: true,
                    secure: false,
                },
            },
        }
    };
});
