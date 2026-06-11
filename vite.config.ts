import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// For GitHub Pages: set base to your repo name, e.g. '/world_cup/'
export default defineConfig({
  base: process.env.BASE_URL || '/world_cup/',
  plugins: [react(), tailwindcss()],
})
