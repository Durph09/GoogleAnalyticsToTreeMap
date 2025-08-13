import 'dotenv/config';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import fs from 'fs/promises';

import path from 'path';
import * as XLSX from 'xlsx';

const propertyId = '416205358';
const base64Credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64;

// Output paths
const OUTPUT_JSON = path.join('src', 'lib', 'analytics-merged.json');
const OUTPUT_XLSX = path.join('src', 'lib', 'analytics-two-week-change.xlsx');

function pct(curr, prev) {
  if (!prev) return curr ? Infinity : 0; // if prev=0 and curr>0 → Infinity; if both 0 → 0
  return ( (curr - prev) / prev ) * 100;
}

export default async function fetchAnalyticsReport() {
  if (!base64Credentials) {
    throw new Error('Missing Google Analytics credentials.');
  }

  const credentials = JSON.parse(
    Buffer.from(base64Credentials, 'base64').toString('utf-8')
  );

  // Three consecutive 2‑week windows
  const windows = [
    { label: 'current',  startDate: '14daysAgo', endDate: 'today' },
    { label: 'previous', startDate: '28daysAgo', endDate: '15daysAgo' },
    { label: 'prior',    startDate: '42daysAgo', endDate: '29daysAgo' },
  ];

  const analyticsDataClient = new BetaAnalyticsDataClient({ credentials });

  try {
    // Fetch in parallel
    const windowResults = await Promise.all(
      windows.map(async (w) => {
        const [response] = await analyticsDataClient.runReport({
          property: `properties/${propertyId}`,
          dateRanges: [{ startDate: w.startDate, endDate: w.endDate }],
          dimensions: [{ name: 'pagePath' }],
          metrics: [{ name: 'screenPageViews' }],
        });

        const rows = (response.rows || []).map((row) => ({
          pagePath: row.dimensionValues?.[0]?.value ?? '',
          views: Number(row.metricValues?.[0]?.value ?? 0),
        }));

        return { label: w.label, rows };
      })
    );

    // Merge by pagePath
    const merged = new Map(); // pagePath -> { pagePath, current, previous, prior }
    for (const { label, rows } of windowResults) {
      for (const r of rows) {
        const key = r.pagePath;
        if (!key) continue;
        if (!merged.has(key)) {
          merged.set(key, { pagePath: key, current: 0, previous: 0, prior: 0 });
        }
        merged.get(key)[label] = (merged.get(key)[label] || 0) + Number(r.views || 0);
      }
    }

    // Sort by total views DESC for convenience
    const output = Array.from(merged.values()).sort((a, b) => {
      const at = (a.current || 0) + (a.previous || 0) + (a.prior || 0);
      const bt = (b.current || 0) + (b.previous || 0) + (b.prior || 0);
      return bt - at;
    });

    await fs.mkdir(path.dirname(OUTPUT_JSON), { recursive: true });
    await fs.writeFile(OUTPUT_JSON, JSON.stringify(output, null, 2));
    console.log(`✅ Merged analytics written to ${OUTPUT_JSON}`);

    // ===== Build Excel workbook =====
    // Add % change columns:
    const rowsForSheet = [
      [
        'pagePath',
        'views_current (0–14d)',
        'views_previous (15–28d)',
        'views_prior (29–42d)',
        '%Δ current vs previous',
        '%Δ previous vs prior',
        '%Δ current vs prior'
      ],
      ...output.map((r) => {
        const d1 = pct(r.current, r.previous);
        const d2 = pct(r.previous, r.prior);
        const d3 = pct(r.current, r.prior);
        // Use blanks instead of Infinity for nicer display (optional)
        const f = (x) => (Number.isFinite(x) ? x.toFixed(2) : '');
        return [
          r.pagePath,
          r.current,
          r.previous,
          r.prior,
          f(d1),
          f(d2),
          f(d3),
        ];
      }),
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rowsForSheet);
    XLSX.utils.book_append_sheet(wb, ws, 'TwoWeekChange');
    XLSX.writeFile(wb, OUTPUT_XLSX);
    console.log(`📊 Excel written to ${OUTPUT_XLSX}`);
    // ================================

  } catch (error) {
    console.error('❌ Error fetching/merging/exporting:', error);
  }
};

fetchAnalyticsReport();

// Optional direct run:
// fetchAnalyticsReport();
