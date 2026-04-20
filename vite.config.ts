/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(async () => {
  const plugins = [react()]
  if (!process.env.VITEST) {
    const tailwindcss = (await import('@tailwindcss/vite')).default
    plugins.push(tailwindcss())
  }
  return {
    plugins,
    test: {
      include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    },
  }
})
