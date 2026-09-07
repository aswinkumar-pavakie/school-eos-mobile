// Same receipt template as school-eos-website's src/app/receipts/print/page.tsx
// (ReceiptDocument), reimplemented as a standalone HTML string for expo-print --
// same layout, same colours, same real fields (school profile, student, line
// items). Real data only: every value comes from the backend's own
// GET /parent/receipts/:id, nothing here is a placeholder.

import { formatDate, formatMoneyDetail } from './format';
import type { ReceiptDetail } from './parent-api';

const MODE_LABELS: Record<string, string> = {
  UPI: 'UPI',
  CARD: 'Card',
  NETBANKING: 'Net Banking',
  CASH: 'Cash',
  CHEQUE: 'Cheque',
  DD: 'Demand Draft',
  WALLET_TOPUP: 'Wallet Top-up',
};

function esc(value: string | null | undefined): string {
  if (!value) return '';
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function buildReceiptHtml(detail: ReceiptDetail): string {
  const { receipt, payment, student, lineItems, school } = detail;
  const isDD = payment.mode === 'DD';

  const addressLine = [school?.addressLine1, school?.addressLine2, school?.city, school?.district, school?.state, school?.pincode]
    .filter(Boolean)
    .join(', ');
  const boardLine = [school?.board, school?.recognitionNo ? `Recognition No: ${school.recognitionNo}` : null].filter(Boolean).join(' · ');
  const contactLine = [school?.contactPhone ? `Phone: ${school.contactPhone}` : null, school?.contactEmail].filter(Boolean).join(' · ');

  const rows = (lineItems.length > 0 ? lineItems : [{ feeHeadId: null, feeHeadName: 'Fee payment', instalmentNo: 0, amountPaise: receipt.amountPaise }])
    .map(
      (item, i) => `
      <tr>
        <td class="muted">${i + 1}</td>
        <td>${esc(item.feeHeadName ?? 'Fee')}${item.instalmentNo > 0 ? ` — Instalment ${item.instalmentNo}` : ''}</td>
        <td class="right mono">${formatMoneyDetail(item.amountPaise)}</td>
      </tr>`,
    )
    .join('');

  return `<!doctype html>
<html><head><meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1a1a2e; padding: 24px; }
  .header { text-align: center; border-bottom: 2px solid #1B3F9E; padding-bottom: 14px; margin-bottom: 18px; }
  .school { font-size: 20px; font-weight: 800; color: #1B3F9E; margin: 0; }
  .muted { color: #6b7280; font-size: 11px; margin: 2px 0; }
  .receipt-title { font-size: 13px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin-top: 8px; }
  .grid { display: flex; justify-content: space-between; gap: 24px; font-size: 13px; margin-bottom: 16px; }
  .col { flex: 1; }
  .row { display: flex; justify-content: space-between; padding: 2px 0; }
  .right { text-align: right; }
  .mono { font-family: 'Courier New', monospace; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; border-bottom: 2px solid #1B3F9E; color: #1B3F9E; padding: 6px 4px; }
  td { border-bottom: 1px solid #e5e7eb; padding: 6px 4px; }
  .total-row td { background: #f3f4f6; font-weight: 700; }
  .dd-box { border: 1px solid rgba(27,63,158,.3); background: rgba(27,63,158,.05); border-radius: 8px; padding: 12px; margin-top: 14px; font-size: 12.5px; }
  .sign { display: flex; justify-content: space-between; margin-top: 48px; font-size: 12px; color: #6b7280; }
  .sign div { width: 45%; border-top: 1px solid #9ca3af; text-align: center; padding-top: 6px; }
  .footer { text-align: center; font-size: 10px; color: #9ca3af; margin-top: 20px; }
</style></head>
<body>
  <div class="header">
    <p class="school">${esc(school?.name ?? 'School EOS')}</p>
    ${addressLine ? `<p class="muted">${esc(addressLine)}</p>` : ''}
    ${boardLine ? `<p class="muted">${esc(boardLine)}</p>` : ''}
    ${contactLine ? `<p class="muted">${esc(contactLine)}</p>` : ''}
    <p class="receipt-title">Fee Payment Receipt</p>
  </div>

  <div class="grid">
    <div class="col">
      <div class="row"><span class="muted">Name of Student</span><strong>${esc(student?.displayName ?? '—')}</strong></div>
      <div class="row"><span class="muted">Admission No.</span><strong>${esc(student?.admissionNo ?? '—')}</strong></div>
      <div class="row"><span class="muted">Grade / Section</span><span>${esc([student?.gradeName, student?.sectionName].filter(Boolean).join(' / ') || '—')}</span></div>
      <div class="row"><span class="muted">Date of Payment</span><span>${formatDate(payment.confirmedAt ?? payment.initiatedAt)}</span></div>
    </div>
    <div class="col right">
      <div class="row"><span class="muted">Receipt No.</span><strong class="mono">${esc(receipt.receiptNo)}</strong></div>
      <div class="row"><span class="muted">Financial Year</span><span>${esc(receipt.financialYear)}</span></div>
      <div class="row"><span class="muted">Mode of Payment</span><span>${MODE_LABELS[payment.mode] ?? esc(payment.mode)}</span></div>
      ${isDD ? `<div class="row"><span class="muted">Bank</span><span>${esc(payment.gateway ?? '—')}</span></div><div class="row"><span class="muted">DD Reference No.</span><span class="mono">${esc(payment.gatewayRef ?? '—')}</span></div>` : ''}
    </div>
  </div>

  <table>
    <thead><tr><th style="width:24px">#</th><th>Particulars</th><th class="right">Amount</th></tr></thead>
    <tbody>
      ${rows}
      <tr class="total-row"><td colspan="2">Total</td><td class="right mono">${formatMoneyDetail(receipt.amountPaise)}</td></tr>
    </tbody>
  </table>

  <div class="sign">
    <div>Authorized Signatory</div>
    <div>Parent / Guardian Signature</div>
  </div>
  <p class="footer">This is a computer-generated receipt issued by ${esc(school?.name ?? 'School EOS')}.</p>
</body></html>`;
}
