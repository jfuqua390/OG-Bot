// CLI helper: given a report code that a player uploaded, prints their
// numeric Warcraft Logs user ID so it can be added to config/uploaders.json.
//
// Usage: npm run resolve-uploader -- <report-code>
// A report code is the part after /reports/ in a WCL report URL, e.g.
// for https://www.warcraftlogs.com/reports/AbCdEfGhJ23K it's "AbCdEfGhJ23K".

import { config } from './config.js';
import { fetchReportByCode } from './wclClient.js';

const code = process.argv[2];

if (!code) {
  console.error('Usage: npm run resolve-uploader -- <report-code>');
  process.exit(1);
}

try {
  const report = await fetchReportByCode(config.wcl, code);
  if (!report.owner) {
    console.error(`Report "${code}" has no owner on record (it may be anonymous).`);
    process.exit(1);
  }
  console.log(`Report: ${report.title} (${report.code})`);
  console.log(`Uploader: ${report.owner.name}`);
  console.log(`Numeric user ID: ${report.owner.id}`);
  console.log('\nAdd this to config/uploaders.json, e.g.:');
  console.log(
    JSON.stringify({ id: report.owner.id, label: report.owner.name }, null, 2)
  );
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
