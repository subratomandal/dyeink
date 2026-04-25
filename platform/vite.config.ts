import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const manualChunkGroups: Record<string, string[]> = {
    'vendor-react': ['react', 'react-dom', 'react-router-dom'],
    'vendor-ui': ['framer-motion', 'lucide-react', 'recharts', 'clsx', 'tailwind-merge'],
    'vendor-3d': ['three', 'ogl', 'postprocessing', 'gsap'],
    'vendor-utils': ['date-fns', 'dompurify', 'zustand', 'axios', 'sonner'],
}

function getPackageName(id: string) {
    const marker = '/node_modules/'
    const idx = id.lastIndexOf(marker)
    if (idx === -1) return null
    const parts = id.slice(idx + marker.length).split('/')
    return parts[0]?.startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0]
}

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 5173,
        // The Worker (wrangler dev) listens on 8787 by default; point at it
        // so /api requests work in dev without a separate Fastify server.
        proxy: {
            '/api': {
                target: 'http://localhost:8787',
                changeOrigin: true,
            },
            '/img': {
                target: 'http://localhost:8787',
                changeOrigin: true,
            },
        },
    },
    build: {
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    const packageName = getPackageName(id)
                    if (!packageName) return undefined

                    for (const [chunkName, packages] of Object.entries(manualChunkGroups)) {
                        if (packages.includes(packageName)) return chunkName
                    }
                    return undefined
                },
            },
        },
    },
})
