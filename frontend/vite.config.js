import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  cacheDir: "./.vite",
  optimizeDeps: {
    include: ["lucide-react", "react", "react-dom/client", "react/jsx-runtime"],
    noDiscovery: true,
  },
})
