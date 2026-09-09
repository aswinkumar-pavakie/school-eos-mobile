// Real "download this as a PDF" for the Parent/Faculty app.
//
// This is Print.printAsync({html}), NOT printToFileAsync + Sharing.shareAsync
// -- that pair was tried twice on real devices and confirmed broken both
// times with the exact same error: "call to function 'ExpoSharing.shareAsync'
// has been rejected caused by: Not allowed to read file under given URL."
// This is a real, documented Expo Go constraint: a temp file expo-print
// writes to its own sandboxed storage is not readable by expo-sharing while
// running inside Expo Go's fixed app shell -- not something fixable by
// changing options, only by a custom dev client build (EAS Build), which is
// a separate, bigger step outside Expo Go entirely.
//
// Print.printAsync renders straight from HTML through the OS's native print
// pipeline instead, which never touches file-sharing permissions at all --
// works the same in Expo Go and a real build. On iOS, the print preview
// screen has a Share icon that offers "Save to Files" -- a real local PDF
// save; on Android, the print dialog's own "Save as PDF" destination does
// the same. This is the actual, working "download" inside Expo Go.

import * as Print from 'expo-print';

export async function downloadPdf(html: string, _options: { dialogTitle: string }): Promise<void> {
  await Print.printAsync({ html });
}
