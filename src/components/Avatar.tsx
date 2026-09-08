// Colored circle with initials, optionally showing a real photo when one exists.
// Deliberately generic (not Hostel-Warden-specific) -- any list of people could
// reuse this, matching this app's "shared components live flat in src/components"
// convention. A fixed palette keyed off the name's own characters gives each
// person a stable (not random-per-render) color, the same idiom the reference
// design's own avatar circles use.

import { Image, StyleSheet, Text, View } from 'react-native';
import { parentColors } from '@/lib/theme';

const PALETTE = ['#2A62F0', '#7C3AED', '#0EA5E9', '#059669', '#D97706', '#DB2777', '#4F46E5'];

function colorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length]!;
}

function initialsFor(firstName: string, lastName: string | null): string {
  const first = firstName.trim().charAt(0);
  const last = (lastName ?? '').trim().charAt(0);
  return (first + last).toUpperCase() || '?';
}

export function Avatar({
  firstName,
  lastName,
  photoUrl,
  size = 44,
}: {
  firstName: string;
  lastName: string | null;
  photoUrl?: string | null;
  size?: number;
}) {
  const dimension = { width: size, height: size, borderRadius: size / 2 };

  if (photoUrl) {
    return <Image source={{ uri: photoUrl }} style={[styles.image, dimension]} />;
  }

  return (
    <View style={[styles.circle, dimension, { backgroundColor: colorFor(`${firstName}${lastName ?? ''}`) }]}>
      <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{initialsFor(firstName, lastName)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  image: { backgroundColor: parentColors.borderSoft },
  initials: { color: '#fff', fontFamily: 'PlusJakartaSans_800ExtraBold' },
});
