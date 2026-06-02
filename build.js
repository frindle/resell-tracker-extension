const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const watch = process.argv.includes('--watch');
const target = process.argv.includes('--firefox') ? 'firefox' : 'chrome';
const outdir = target === 'firefox' ? 'dist-firefox' : 'dist';

const backgroundEntry = { 'background': 'src/background/index.ts' };
const contentEntries = {
  'content/amazon': 'src/content/amazon.ts',
  'content/walmart': 'src/content/walmart.ts',
  'content/costco': 'src/content/costco.ts',
  'content/bigskybuyers': 'src/content/bigskybuyers.ts',
  'options/options': 'src/options/options.ts',
  'popup/popup': 'src/popup/popup.ts',
};
// MAIN world scripts must NOT include the polyfill — they run as page scripts
const mainWorldEntries = {
  'content/costco-interceptor': 'src/content/costco-interceptor.ts',
};

const polyfillPath = path.resolve('node_modules/webextension-polyfill/dist/browser-polyfill.min.js');

const commonOptions = {
  bundle: true,
  outdir,
  format: 'iife',
  target: 'es2020',
  sourcemap: false,
  define: { 'process.env.TARGET': JSON.stringify(target) },
};

// Background service worker must NOT include the polyfill — it crashes Chrome MV3 service workers
const ctxBackground = esbuild.context({ ...commonOptions, entryPoints: backgroundEntry });
// Content/popup scripts get the polyfill for Firefox compatibility
const ctxContent = esbuild.context({ ...commonOptions, entryPoints: contentEntries, inject: [polyfillPath] });
// MAIN world content scripts run as page scripts — no polyfill, no chrome.* APIs
const ctxMainWorld = esbuild.context({ ...commonOptions, entryPoints: mainWorldEntries });

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

  const [bg, content, mainWorld] = await Promise.all([ctxBackground, ctxContent, ctxMainWorld]);
  await Promise.all([bg.rebuild(), content.rebuild(), mainWorld.rebuild()]);

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
    await Promise.all([bg.watch(), content.watch(), mainWorld.watch()]);
    console.log('Watching for changes…');
  } else {
    await Promise.all([bg.dispose(), content.dispose(), mainWorld.dispose()]);
  }
}

build().catch(e => { console.error(e); process.exit(1); });
