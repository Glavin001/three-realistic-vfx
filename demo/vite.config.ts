import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  // Serve flipbook assets from the root assets directory
  publicDir: path.resolve(__dirname, '..', 'assets'),
  resolve: {
    dedupe: ['three', 'react', 'react-dom', '@react-three/fiber', 'three.quarks'],
    alias: {
      // Force the library's react imports to resolve to the demo's copies
      // This prevents duplicate module instances from the file:.. link
      'three': path.resolve(__dirname, 'node_modules/three'),
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      '@react-three/fiber': path.resolve(__dirname, 'node_modules/@react-three/fiber'),
    },
  },
});
