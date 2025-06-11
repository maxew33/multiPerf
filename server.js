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

/**
 * Charge Lighthouse à la volée (import dynamique ESM)
 * et renvoie la référence vers le module.
 */
async function loadLighthouse() {
  const { default: lighthouse } = await import('lighthouse');
  return lighthouse;
}

app.post('/audit', async (req, res) => {
  const urls = req.body.urls || [];
  const reports = [];

  // On charge Lighthouse UNE SEULE FOIS (au 1er appel)
  const lighthouse = await loadLighthouse();

  for (const rawUrl of urls) {
    const url = rawUrl.trim();
    if (!url) continue;

    try {
      const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
      const options = {
        port: chrome.port,
        output: 'html',
        onlyCategories: ['performance', 'seo', 'accessibility'],
      };

      const runnerResult = await lighthouse(url, options);

      const parsedUrl = new URL(url);
      const safeName = parsedUrl.hostname.replace(/\./g, '_');
      const fileName = `report_${safeName}_${Date.now()}.html`;
      const filePath = path.join(REPORTS_DIR, fileName);

      fs.writeFileSync(filePath, runnerResult.report);
      await chrome.kill();

      reports.push(`/reports/${fileName}`);
    } catch (err) {
      console.error('❌ Erreur audit:', err.message);
    }
  }

  res.json({ reports });
});

app.listen(port, () => {
  console.log(`✅ Serveur en écoute sur http://localhost:${port}`);
});
