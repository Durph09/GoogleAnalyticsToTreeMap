import 'dotenv/config';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import fs from 'fs/promises';
import path from 'path';

// ---- Config ----
const propertyId = '416205358';
const base64Credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64;

// Input (product catalog) — adjust if yours lives elsewhere
const PRODUCTS_FILE = path.join('src', 'lib', 'all_prods_20250204.json');

// Outputs
const OUT_JSON = path.join('src', 'lib', 'weekly_product_views_2025.json'); // flat rows
const OUT_CSV  = path.join('src', 'lib', 'weekly_product_views_2025.csv');  // flat rows (Excel/SQL)

// ---- Helpers ----

// Monday of a given date
function mondayOf(d) {
  const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const wd = dt.getUTCDay(); // 0=Sun..6=Sat
  const diff = (wd === 0 ? -6 : 1 - wd); // shift to Monday
  dt.setUTCDate(dt.getUTCDate() + diff);
  return dt;
}

// Format YYYY-MM-DD
function ymd(d) {
  return d.toISOString().slice(0, 10);
}

// Add days
function addDays(d, n) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

// Build Monday-start weekly ranges from (inclusive) start to (inclusive) end
function weekRanges(startInclusive, endInclusive) {
  // anchor to first Monday on/after the start
  let startMonday = mondayOf(startInclusive);
  if (startMonday < startInclusive) startMonday = addDays(startMonday, 7);

  const weeks = [];
  for (let s = startMonday; s <= endInclusive; s = addDays(s, 7)) {
    const e = addDays(s, 6);
    const end = e > endInclusive ? endInclusive : e;
    weeks.push({ start: ymd(s), end: ymd(end) });
  }
  return weeks;
}

// SKU core (five digits in the middle)
// 1) honor your rule: strip leading 'H10' and trailing 'H'
// 2) if pattern deviates, fallback to last 5 digits
function skuCore5(sku) {
  if (typeof sku !== 'string') return '';
  let v = sku;
  if (v.startsWith('H10')) v = v.slice(3);  // remove leading H10
  if (v.endsWith('H')) v = v.slice(0, -1);  // remove trailing H
  // if what's left is digits length≥5, use last 5
  const digits = (v.match(/\d+/g) || []).join('');
  if (digits.length >= 5) return digits.slice(-5);
  // generic fallback
  const rawDigits = (sku.match(/\d+/g) || []).join('');
  return rawDigits.length >= 5 ? rawDigits.slice(-5) : rawDigits;
}

function toCSV(rows) {
  const esc = (s) => {
    const v = String(s ?? '');
    return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  };
  return rows.map(r => r.map(esc).join(',')).join('\n');
}

async function loadProducts() {
  const buf = await fs.readFile(PRODUCTS_FILE, 'utf8');
  const json = JSON.parse(buf);
  // Map url -> { skuCore5, fullSku, productId }
  const map = new Map();
  for (const p of json.data || []) {
    if (!p?.url) continue;
    map.set(p.url, {
      skuCore5: skuCore5(p.sku),
      fullSku: p.sku,
      productId: p.id,
    });
  }
  return map;
}

async function run() {
  if (!base64Credentials) {
    throw new Error('Missing Google Analytics credentials (GOOGLE_APPLICATION_CREDENTIALS_BASE64).');
  }
  const credentials = JSON.parse(Buffer.from(base64Credentials, 'base64').toString('utf-8'));
  const analytics = new BetaAnalyticsDataClient({ credentials });

  // Date window: Jan 1, 2025 .. yesterday
  const start = new Date(Date.UTC(2025, 0, 1)); // 2025-01-01
  const today = new Date(); // assume server local -> use UTC slice only
  const yesterdayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  yesterdayUTC.setUTCDate(yesterdayUTC.getUTCDate() - 1);

  const weeks = weekRanges(start, yesterdayUTC);
  console.log(`🗓️ Weeks to load: ${weeks.length} (from ${weeks[0]?.start} to ${weeks[weeks.length - 1]?.end})`);

  // Load products map
  const productByUrl = await loadProducts();
  console.log(`📦 Products loaded: ${productByUrl.size}`);

  // We’ll build a flat array of rows for easy SQL import
  /** @type {Array<{week_start_date:string, product_url:string, sku5:string, views:number, product_id:number|null}>} */
  const out = [];

  // Run each week sequentially (gentler on GA quotas)
  for (const w of weeks) {
    console.log(`➡️  GA: ${w.start} .. ${w.end}`);
    const [resp] = await analytics.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: w.start, endDate: w.end }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }],
    });

    const rows = resp.rows || [];
    // Aggregate by product pagePath
    const weekTotals = new Map(); // url -> views
    for (const r of rows) {
      const url = r.dimensionValues?.[0]?.value ?? '';
      const views = Number(r.metricValues?.[0]?.value ?? 0);
      if (!url || !productByUrl.has(url)) continue; // keep product pages only
      weekTotals.set(url, (weekTotals.get(url) ?? 0) + views);
    }

    for (const [product_url, views] of weekTotals) {
      const meta = productByUrl.get(product_url);
      out.push({
        week_start_date: w.start,
        product_url,
        sku5: meta?.skuCore5 ?? '',
        views,
        product_id: meta?.productId ?? null,
      });
    }
  }

  // Write JSON & CSV
  await fs.mkdir(path.dirname(OUT_JSON), { recursive: true });
  await fs.writeFile(OUT_JSON, JSON.stringify(out, null, 2));

  const csvRows = [
    ['week_start_date', 'product_url', 'sku5', 'views', 'product_id'],
    ...out.map(r => [r.week_start_date, r.product_url, r.sku5, r.views, r.product_id ?? ''])
  ];
  await fs.writeFile(OUT_CSV, toCSV(csvRows));

  console.log(`✅ Wrote ${OUT_JSON}`);
  console.log(`✅ Wrote ${OUT_CSV}`);
}

// Execute when run directly
if (import.meta.url === `file://${process.argv[1]}`
    ) 
    {
  console.log('Running fetch-weekly-products-2025.mjs');
  run().catch(err => {
    console.error('❌ Weekly build failed:', err);
    process.exit(1);
  });
}

export default run;
