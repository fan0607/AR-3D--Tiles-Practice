import { defineConfig } from 'vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [ basicSsl()],
  server: {
    https: true,
    host: '0.0.0.0',
    port: 5173,
    cors: true,
  },
  preview: {
    https: true,
    host: '0.0.0.0',
    port: 5173
  }
})
 