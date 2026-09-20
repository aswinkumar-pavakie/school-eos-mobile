// Real "Hostel report" PDF -- replaces the earlier plain-CSV-via-Share.share
// export (that never had a backend, just built a raw text string). Reuses
// the exact same real, already-fetched section data (Occupancy/Complaints/
// Gate movement/Fees, see reports/index.tsx's own header comment) -- this
// file only renders it as styled HTML for expo-print, same
// downloadPdf()/receipt-html.ts pattern already proven elsewhere in this app.
// No fabricated figures: every row here is the same real row the on-screen
// section tiles already show.

import { formatDate } from './format';
import type { SchoolInfo } from './vice-principal-profile-api';

export interface HostelReportSection {
  key: string;
  label: string;
  rows: (string | number)[][];
}

function esc(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function sectionTable(section: HostelReportSection): string {
  const [header, ...body] = section.rows;
  if (!header) {
    return `<div class="section"><h2>${esc(section.label)}</h2><p class="muted">No data available.</p></div>`;
  }
  const theadCells = header.map((c) => `<th>${esc(c)}</th>`).join('');
  const bodyRows = body
    .map((row) => `<tr>${row.map((c, i) => `<td class="${i === 0 ? '' : 'right mono'}">${esc(c)}</td>`).join('')}</tr>`)
    .join('');
  return `
    <div class="section">
      <h2>${esc(section.label)}</h2>
      <table>
        <thead><tr>${theadCells}</tr></thead>
        <tbody>${bodyRows || `<tr><td colspan="${header.length}" class="muted">No data available.</td></tr>`}</tbody>
      </table>
    </div>`;
}

export function buildHostelReportHtml(params: {
  school: SchoolInfo | null;
  wardenName: string;
  from: string;
  to: string;
  sections: HostelReportSection[];
}): string {
  const { school, wardenName, from, to, sections } = params;
  const addressLine = [school?.addressLine1, school?.addressLine2, school?.city, school?.district, school?.state, school?.pincode]
    .filter(Boolean)
    .join(', ');
  const boardLine = [school?.board, school?.code ? `School Code: ${school.code}` : null].filter(Boolean).join(' · ');
  const contactLine = [school?.contactPhone ? `Phone: ${school.contactPhone}` : null, school?.contactEmail].filter(Boolean).join(' · ');
  const generatedOn = formatDate(new Date().toISOString());

  return `<!doctype html>
<html><head><meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #101828; padding: 32px; }
  .header { text-align: center; border-bottom: 3px solid #1B3F9E; padding-bottom: 16px; margin-bottom: 20px; }
  .school { font-size: 22px; font-weight: 800; color: #1B3F9E; margin: 0; letter-spacing: -0.01em; }
  .muted { color: #6b7280; font-size: 11px; margin: 2px 0; }
  .report-title { font-size: 13px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; margin-top: 10px; color: #101828; }
  .meta-grid { display: flex; justify-content: space-between; gap: 24px; font-size: 12.5px; margin-bottom: 24px; background: #f7f9fc; border-radius: 10px; padding: 14px 18px; }
  .meta-col { flex: 1; }
  .meta-row { display: flex; justify-content: space-between; padding: 3px 0; }
  .right { text-align: right; }
  .mono { font-family: 'Courier New', monospace; }
  .section { margin-bottom: 22px; page-break-inside: avoid; }
  .section h2 { font-size: 14px; font-weight: 800; color: #1B3F9E; margin: 0 0 8px 0; padding-bottom: 6px; border-bottom: 1px solid #e5e7eb; }
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  th { text-align: left; border-bottom: 2px solid #1B3F9E; color: #1B3F9E; padding: 7px 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
  td { border-bottom: 1px solid #e5e7eb; padding: 7px 6px; }
  tr:last-child td { border-bottom: none; }
  .footer { text-align: center; font-size: 10px; color: #9ca3af; margin-top: 28px; border-top: 1px solid #e5e7eb; padding-top: 12px; }
</style></head>
<body>
  <div class="header">
    <p class="school">${esc(school?.name ?? 'School EOS')}</p>
    ${addressLine ? `<p class="muted">${esc(addressLine)}</p>` : ''}
    ${boardLine ? `<p class="muted">${esc(boardLine)}</p>` : ''}
    ${contactLine ? `<p class="muted">${esc(contactLine)}</p>` : ''}
    <p class="report-title">Hostel Report</p>
  </div>

  <div class="meta-grid">
    <div class="meta-col">
      <div class="meta-row"><span class="muted">Prepared by</span><strong>${esc(wardenName)}</strong></div>
      <div class="meta-row"><span class="muted">Period</span><span>${esc(from)} to ${esc(to)}</span></div>
    </div>
    <div class="meta-col right">
      <div class="meta-row"><span class="muted">Generated on</span><span>${esc(generatedOn)}</span></div>
      <div class="meta-row"><span class="muted">Sections</span><span>${sections.length}</span></div>
    </div>
  </div>

  ${sections.map(sectionTable).join('')}

  <p class="footer">This is a computer-generated report issued by ${esc(school?.name ?? 'School EOS')}. Figures reflect live data at the time of generation.</p>
</body></html>`;
}
