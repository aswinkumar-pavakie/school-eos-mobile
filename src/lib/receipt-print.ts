// Real "download the receipt" for the Parent app -- see pdf-download.ts for
// why this is printToFileAsync + Sharing (a direct save/share of a real PDF
// file, with the OS's own print dialog as a safety-net fallback) rather than
// only ever opening the print dialog the way Finance's own printed documents
// on the web app do -- the parent mobile app's own "Download receipt" button
// should behave like a real download, not a print action.

import { buildReceiptHtml } from './receipt-html';
import { downloadPdf } from './pdf-download';
import type { ReceiptDetail } from './parent-api';

export async function printReceipt(detail: ReceiptDetail): Promise<void> {
  const html = buildReceiptHtml(detail);
  await downloadPdf(html, { dialogTitle: `Receipt ${detail.receipt.receiptNo}` });
}
