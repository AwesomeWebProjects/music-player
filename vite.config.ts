import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const isLibBuild = mode === 'lib';

  return {
    plugins: [
      ...(isLibBuild
        ? [
            dts({
              include: ['src'],
              outDir: 'dist',
              rollupTypes: true,
            }),
          ]
        : []),
    ],
    build: isLibBuild
      ? {
          lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'MusicPlayer',
            formats: ['es', 'cjs'],
            fileName: (format) =>
              `music-player.${format === 'es' ? 'js' : 'cjs'}`,
          },
        }
      : {
          outDir: 'dist-demo',
        },
  };
});