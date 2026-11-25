import { build } from 'esbuild';

await build({
  entryPoints: ['src/server/vercel.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  packages: 'external',
  outfile: 'api/index.mjs',
});

console.log('✓ Bundled api/index.mjs');
