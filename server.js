// const express = require('express');
// const fs = require('fs');
// const path = require('path');
// const chromeLauncher = require('chrome-launcher');
// const { URL } = require('url');

// const app = express();
// const port = 3000;

// app.use(express.json());
// app.use(express.static('public'));
// app.use('/reports', express.static(path.join(__dirname, 'reports')));

// const REPORTS_DIR = path.join(__dirname, 'reports');
// if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR);

// /**
//  * Charge Lighthouse à la volée (import dynamique ESM)
//  * et renvoie la référence vers le module.
//  */
// async function loadLighthouse() {
//   const { default: lighthouse } = await import('lighthouse');
//   return lighthouse;
// }

// app.post('/audit', async (req, res) => {
//   const urls = req.body.urls || [];
//   const reports = [];

//   // On charge Lighthouse UNE SEULE FOIS (au 1er appel)
//   const lighthouse = await loadLighthouse();

//   for (const rawUrl of urls) {
//     const url = rawUrl.trim();
//     if (!url) continue;

//     try {
//       const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
//       const options = {
//         port: chrome.port,
//         output: 'html',
//         onlyCategories: ['performance', 'seo', 'accessibility'],
//       };

//       const runnerResult = await lighthouse(url, options);

//       const parsedUrl = new URL(url);
//       const safeName = parsedUrl.hostname.replace(/\./g, '_');
//       const fileName = `report_${safeName}_${Date.now()}.html`;
//       const filePath = path.join(REPORTS_DIR, fileName);

//       fs.writeFileSync(filePath, runnerResult.report);
//       await chrome.kill();

//       reports.push(`/reports/${fileName}`);
//     } catch (err) {
//       console.error('❌ Erreur audit:', err.message);
//     }
//   }

//   res.json({ reports });
// });

// app.listen(port, () => {
//   console.log(`✅ Serveur en écoute sur http://localhost:${port}`);
// });

// V2


// const express = require('express');
// const fs = require('fs');
// const path = require('path');
// const chromeLauncher = require('chrome-launcher');
// const os = require('os');
// const { URL } = require('url');

// const app = express();
// const port = 3000;

// app.use(express.json());
// app.use(express.static('public'));
// app.use('/reports', express.static(path.join(__dirname, 'reports')));

// const REPORTS_DIR = path.join(__dirname, 'reports');
// if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR);

// async function loadLighthouse() {
//   const { default: lighthouse } = await import('lighthouse');
//   return lighthouse;
// }

// // Moyenne d'un tableau de scores
// const average = arr => arr.reduce((a, b) => a + b, 0) / arr.length;

// app.post('/audit', async (req, res) => {
//   const urls = req.body.urls || [];
//   if (!urls.length) return res.status(400).json({ error: 'Aucune URL fournie.' });

//   const lighthouse = await loadLighthouse();
//   const resultsSummary = [];

//   for (const rawUrl of urls) {
//     const url = rawUrl.trim();
//     if (!url || !/^https?:\/\//.test(url)) continue;

//     const parsedUrl = new URL(url);
//     const safeName = parsedUrl.hostname.replace(/\./g, '_');

//     const configs = [
//       { name: 'desktop_normal', formFactor: 'desktop', incognito: false },
//       { name: 'mobile_normal', formFactor: 'mobile', incognito: false },
//       { name: 'desktop_private', formFactor: 'desktop', incognito: true },
//       { name: 'mobile_private', formFactor: 'mobile', incognito: true },
//     ];

//     const environmentResults = {};

//     for (const config of configs) {
//       const scores = [];
//       const reportLinks = [];

//       for (let i = 0; i < 3; i++) {
//         const tmpDir = config.incognito
//           ? fs.mkdtempSync(path.join(os.tmpdir(), 'lh_profile_'))
//           : null;

//         const chrome = await chromeLauncher.launch({
//           chromeFlags: [
//             '--headless',
//             '--no-sandbox',
//             '--disable-gpu',
//             ...(config.incognito ? ['--incognito', `--user-data-dir=${tmpDir}`] : [])
//           ]
//         });

//         const options = {
//           port: chrome.port,
//           output: 'html',
//           logLevel: 'error',
//           onlyCategories: ['performance', 'seo', 'accessibility'],
//           formFactor: config.formFactor,
//           screenEmulation: config.formFactor === 'mobile' ? undefined : { disabled: true },
//         };

//         const configSettings = {
//           extends: 'lighthouse:default',
//           settings: {
//             ...options,
//             formFactor: config.formFactor,
//             screenEmulation: config.formFactor === 'mobile' ? undefined : { disabled: true },
//           }
//         };

//         try {
//           const runnerResult = await lighthouse(url, options, configSettings);

//           const cats = runnerResult.lhr.categories;
//           scores.push({
//             performance: cats.performance.score * 100,
//             seo: cats.seo.score * 100,
//             accessibility: cats.accessibility.score * 100,
//           });

//           const fileName = `report_${safeName}_${config.name}_run${i + 1}.html`;
//           const filePath = path.join(REPORTS_DIR, fileName);
//           fs.writeFileSync(filePath, runnerResult.report);
//           reportLinks.push(`/reports/${fileName}`);
//         } catch (err) {
//           console.error(`❌ Erreur audit [${url} - ${config.name}]:`, err.message);
//         } finally {
//           await chrome.kill();
//         }
//       }

//       environmentResults[config.name] = {
//         average: {
//           performance: average(scores.map(s => s.performance)).toFixed(1),
//           seo: average(scores.map(s => s.seo)).toFixed(1),
//           accessibility: average(scores.map(s => s.accessibility)).toFixed(1),
//         },
//         reports: reportLinks
//       };
//     }

//     resultsSummary.push({
//       url,
//       audits: environmentResults
//     });
//   }

//   res.json({ results: resultsSummary });
// });

// app.listen(port, () => {
//   console.log(`✅ Serveur prêt sur http://localhost:${port}`);
// });

// v3

// const express = require('express');
// const fs = require('fs');
// const path = require('path');
// const chromeLauncher = require('chrome-launcher');
// const { URL } = require('url');

// const app = express();
// const port = 3000;

// app.use(express.json());
// app.use(express.static('public'));
// app.use('/reports', express.static(path.join(__dirname, 'reports')));

// const REPORTS_DIR = path.join(__dirname, 'reports');
// if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR);

// async function loadLighthouse() {
//   const { default: lighthouse } = await import('lighthouse');
//   return lighthouse;
// }

// const config = {
//   extends: 'lighthouse:default',
//   settings: {
//     emulatedFormFactor: 'desktop', // ou 'mobile' si tu veux
//     throttling: {
//       rttMs: 150,
//       throughputKbps: 1600,
//       cpuSlowdownMultiplier: 4,
//       requestLatencyMs: 562.5,
//       downloadThroughputKbps: 1474.560,
//       uploadThroughputKbps: 675,
//     },
//     onlyCategories: ['performance', 'seo', 'accessibility', 'best-practices'],
//   }
// };

// app.post('/audit', async (req, res) => {
//   const urls = req.body.urls || [];
//   const results = [];

//   const lighthouse = await loadLighthouse();

//   for (const rawUrl of urls) {
//     const url = rawUrl.trim();
//     if (!url) continue;

//     const scores = {
//       performance: [],
//       seo: [],
//       accessibility: [],
//       bestPractices: []
//     };
//     const metrics = { fcp: [], lcp: [], tbt: [], si: [], cls: [] };
//     const reportLinks = [];

//     for (let i = 0; i < 3; i++) {
//       try {
//         const chrome = await chromeLauncher.launch({
//           chromeFlags: ['--headless', '--no-sandbox']
//         });

//         const options = {
//           port: chrome.port,
//           output: 'html',
//           logLevel: 'info'
//         };

//         const runnerResult = await lighthouse(url, options, config);

//         const audit = runnerResult.lhr;

//         // Collect scores
//         scores.performance.push(audit.categories.performance.score * 100);
//         scores.seo.push(audit.categories.seo.score * 100);
//         scores.accessibility.push(audit.categories.accessibility.score * 100);
//         scores.bestPractices.push(audit.categories['best-practices'].score * 100);

//         // Collect metrics
//         metrics.fcp.push(audit.audits['first-contentful-paint'].numericValue);
//         metrics.lcp.push(audit.audits['largest-contentful-paint'].numericValue);
//         metrics.tbt.push(audit.audits['total-blocking-time'].numericValue);
//         metrics.si.push(audit.audits['speed-index'].numericValue);
//         metrics.cls.push(audit.audits['cumulative-layout-shift'].numericValue);

//         // Save report HTML
//         const parsedUrl = new URL(url);
//         const safeName = parsedUrl.hostname.replace(/\./g, '_');
//         const fileName = `report_${safeName}_${Date.now()}_${i + 1}.html`;
//         const filePath = path.join(REPORTS_DIR, fileName);
//         fs.writeFileSync(filePath, runnerResult.report);

//         reportLinks.push(`/reports/${fileName}`);

//         await chrome.kill();
//       } catch (err) {
//         console.error(`❌ Erreur audit (${url}):`, err.message);
//       }
//     }

//     // Moyennes helper
//     const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

//     results.push({
//       url,
//       averageScores: {
//         performance: avg(scores.performance),
//         seo: avg(scores.seo),
//         accessibility: avg(scores.accessibility),
//         bestPractices: avg(scores.bestPractices)
//       },
//       averageMetrics: {
//         fcp: avg(metrics.fcp),
//         lcp: avg(metrics.lcp),
//         tbt: avg(metrics.tbt),
//         si: avg(metrics.si),
//         cls: avg(metrics.cls)
//       },
//       reports: reportLinks
//     });
//   }

//   res.json({ results });
// });

// app.listen(port, () => {
//   console.log(`✅ Serveur en écoute sur http://localhost:${port}`);
// });


// V4
const express = require('express');
const fs = require('fs');
const path = require('path');
const chromeLauncher = require('chrome-launcher');
const { URL } = require('url');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));
app.use('/reports', express.static(path.join(__dirname, 'reports')));

const REPORTS_DIR = path.join(__dirname, 'reports');
if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR);

async function loadLighthouse() {
  const { default: lighthouse } = await import('lighthouse');
  return lighthouse;
}

// ✅ CONFIGURATION adaptée au comportement manuel
const config = {
  extends: 'lighthouse:default',
  settings: {
    emulatedFormFactor: 'desktop',      // ou 'mobile' selon le besoin
    throttlingMethod: 'provided',       // ✅ AUCUN throttling
    disableStorageReset: true,          // ✅ Conserve cache, IndexedDB, cookies
    onlyCategories: ['performance', 'seo', 'accessibility', 'best-practices'],
  }
};

app.post('/audit', async (req, res) => {
  const urls = req.body.urls || [];
  const results = [];

  const lighthouse = await loadLighthouse();

  for (const rawUrl of urls) {
    const url = rawUrl.trim();
    if (!url) continue;

    const scores = {
      performance: [],
      seo: [],
      accessibility: [],
      bestPractices: []
    };
    const metrics = { fcp: [], lcp: [], tbt: [], si: [], cls: [] };
    const reportLinks = [];

    for (let i = 0; i < 3; i++) {
      try {
        const chrome = await chromeLauncher.launch({
          chromeFlags: [
            '--headless=new',             // ou retirer totalement pour voir le rendu
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-setuid-sandbox',
            '--window-size=1920,1080'
          ]
        });

        const options = {
          port: chrome.port,
          output: 'html',
          logLevel: 'info'
        };

        const runnerResult = await lighthouse(url, options, config);
        const audit = runnerResult.lhr;

        // Collect scores
        scores.performance.push(audit.categories.performance.score * 100);
        scores.seo.push(audit.categories.seo.score * 100);
        scores.accessibility.push(audit.categories.accessibility.score * 100);
        scores.bestPractices.push(audit.categories['best-practices'].score * 100);

        // Collect metrics
        metrics.fcp.push(audit.audits['first-contentful-paint'].numericValue);
        metrics.lcp.push(audit.audits['largest-contentful-paint'].numericValue);
        metrics.tbt.push(audit.audits['total-blocking-time'].numericValue);
        metrics.si.push(audit.audits['speed-index'].numericValue);
        metrics.cls.push(audit.audits['cumulative-layout-shift'].numericValue);

        // Save report
        const parsedUrl = new URL(url);
        const safeName = parsedUrl.hostname.replace(/\./g, '_');
        const fileName = `report_${safeName}_${Date.now()}_${i + 1}.html`;
        const filePath = path.join(REPORTS_DIR, fileName);
        fs.writeFileSync(filePath, runnerResult.report);

        reportLinks.push(`/reports/${fileName}`);

        await chrome.kill();
      } catch (err) {
        console.error(`❌ Erreur audit (${url}):`, err.message);
      }
    }

    // Moyennes helper
    const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    results.push({
      url,
      averageScores: {
        performance: avg(scores.performance),
        seo: avg(scores.seo),
        accessibility: avg(scores.accessibility),
        bestPractices: avg(scores.bestPractices)
      },
      averageMetrics: {
        fcp: avg(metrics.fcp),
        lcp: avg(metrics.lcp),
        tbt: avg(metrics.tbt),
        si: avg(metrics.si),
        cls: avg(metrics.cls)
      },
      reports: reportLinks
    });
  }

  res.json({ results });
});

app.listen(port, () => {
  console.log(`✅ Serveur en écoute sur http://localhost:${port}`);
});
