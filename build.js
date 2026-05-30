const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const watch = process.argv.includes('--watch');
const target = process.argv.includes('--firefox') ? 'firefox' : 'chrome';
const outdir = target === 'firefox' ? 'dist-firefox' : 'dist';

const entries = {
  'background': 'src/background/index.ts',
  'content/amazon': 'src/content/amazon.ts',
  'content/walmart': 'src/content/walmart.ts',
  'options/options': 'src/options/options.ts',
  'popup/popup': 'src/popup/popup.ts',
};

const polyfillPath = path.resolve('node_modules/webextension-polyfill/dist/browser-polyfill.min.js');

const ctx = esbuild.context({
  entryPoints: entries,
  bundle: true,
  outdir,
  format: 'iife',
  target: 'es2020',
  sourcemap: false,
  // Inject the polyfill into every bundle so chrome.* APIs work in Firefox too
  inject: [polyfillPath],
  define: {
    'process.env.TARGET': JSON.stringify(target),
  },
});

function buildManifest(target) {
  const base = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
  if (target === 'firefox') {
    // Firefox MV3 uses background scripts not service_worker
    base.background = { scripts: ['background.js'] };
    base.browser_specific_settings = {
      gecko: {
        id: 'resell-tracker-sync@penndalton',
        strict_min_version: '109.0',
      },
    };
  }
  return JSON.stringify(base, null, 2);
}

async function build() {
  fs.mkdirSync(outdir, { recursive: true });

  const c = await ctx;
  await c.rebuild();

  // Write manifest (browser-specific)
  fs.writeFileSync(path.join(outdir, 'manifest.json'), buildManifest(target));

  // Copy static HTML files
  for (const html of ['options/options.html', 'popup/popup.html']) {
    const src = path.join('src', html);
    const dest = path.join(outdir, html);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }

  // Copy icons
  if (fs.existsSync('icons')) {
    fs.cpSync('icons', path.join(outdir, 'icons'), { recursive: true });
  }

  console.log(`Build complete → ${outdir}/`);

  if (watch) {
    await c.watch();
    console.log('Watching for changes…');
  } else {
    await c.dispose();
  }
}

build().catch(e => { console.error(e); process.exit(1); });
