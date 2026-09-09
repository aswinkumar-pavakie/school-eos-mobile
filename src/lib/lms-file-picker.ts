// Thin wrapper over expo-document-picker (the one new dependency this whole
// Faculty build needed -- narrower/safer than expo-file-system's Storage-
// Access-Framework APIs, which is what caused an earlier regression).
// Single-file picking only, matching the LMS Materials upload flow.

import * as DocumentPicker from 'expo-document-picker';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export interface PickedDocument {
  uri: string;
  name: string;
  mimeType: string;
}

/** Returns null if the user cancelled the picker. */
export async function pickDocument(): Promise<PickedDocument | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: ALLOWED_MIME_TYPES, copyToCacheDirectory: true, multiple: false });
  if (result.canceled || result.assets.length === 0) return null;
  const asset = result.assets[0]!;
  return { uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? 'application/octet-stream' };
}
