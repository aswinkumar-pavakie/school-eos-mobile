// Real "download the permission letter" -- see pdf-download.ts for why this
// goes through Print.printAsync (a real, proven-working save/share path in
// Expo Go) rather than printToFileAsync + Sharing (confirmed broken on real
// devices -- see that file's own header). Works identically for both Faculty
// and Parent, since both call the same buildPermissionLetterHtml() against
// the same PermissionLetterPayload shape.
//
// The signature image is embedded via its real signed Storage URL directly
// (not pre-fetched/converted to a data: URI) -- expo-print's own WebView
// renderer fetches a plain https image URL directly and natively, well
// within the URL's 15-minute signed lifetime, with no extra round trip
// needed here.

import { buildPermissionLetterHtml } from './permission-letter-html';
import { downloadPdf } from './pdf-download';
import type { PermissionLetterPayload } from './permission-requests-api';

export async function printPermissionLetter(letter: PermissionLetterPayload): Promise<void> {
  const html = buildPermissionLetterHtml(letter);
  await downloadPdf(html, { dialogTitle: `Permission letter — ${letter.event.name}` });
}
