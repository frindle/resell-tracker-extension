const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const watch = process.argv.includes('--watch');

const entries = {
  'background': 'src/background/index.ts',
  'content/amazon': 'src/content/amazon.ts',
  'content/walmart': 'src/content/walmart.ts',
  'options/options': 'src/options/options.ts',
  'popup/popup': 'src/popup/popup.ts',
};

const ctx = esbuild.context({
  entryPoints: entries,
  bundle: true,
  outdir: 'dist',
  format: 'iife',
  target: 'es2020',
  sourcemap: false,
  define: {},
});

async function build() {
  const c = await ctx;
  await c.rebuild();

  // Copy static files
  fs.copyFileSync('manifest.json', 'dist/manifest.json');
  for (const html of ['options/options.html', 'popup/popup.html']) {
    const src = path.join('src', html);
    const dest = path.join('dist', html);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
  // Copy icons if present
  if (fs.existsSync('icons')) {
    fs.cpSync('icons', 'dist/icons', { recursive: true });
  }

  console.log('Build complete');

  if (watch) {
    await c.watch();
    console.log('Watching for changes…');
  } else {
    await c.dispose();
  }
}

build().catch(e => { console.error(e); process.exit(1); });
