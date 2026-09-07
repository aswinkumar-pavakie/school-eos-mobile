// Real "download the permission letter" -- see pdf-download.ts for why this is
// printToFileAsync + Sharing (a direct save/share of a real PDF file) rather
// than a print dialog. Works identically for both Faculty and Parent, since
// both call the same buildPermissionLetterHtml() against the same
// PermissionLetterPayload shape.
//
// The signature image is embedded via its real signed Storage URL directly
// (not pre-fetched/converted to a data: URI) -- an earlier version of this
// file did that conversion via Response.blob(), which React Native can only
// implement by copying the whole response into its native blob store and
// round-tripping it through base64 (a real, logged performance warning:
// "Response.blob() is using React Native's Blob... may be slow for large
// responses"), adding real latency/risk to every single download for no
// necessary benefit -- printToFileAsync's own WebView renderer fetches a
// plain https image URL directly and natively, well within the URL's 15-
// minute signed lifetime, with none of that overhead.

import { buildPermissionLetterHtml } from './permission-letter-html';
import { downloadPdf } from './pdf-download';
import type { PermissionLetterPayload } from './permission-requests-api';

export async function printPermissionLetter(letter: PermissionLetterPayload): Promise<void> {
  const html = buildPermissionLetterHtml(letter);
  await downloadPdf(html, { dialogTitle: `Permission letter — ${letter.event.name}` });
}
