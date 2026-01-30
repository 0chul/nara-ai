import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages 배포를 위해 상대 경로 사용 ('/리포지토리명/' 대신 './' 사용 시 대부분 자동 해결됨)
  base: './',
});