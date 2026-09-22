import { Stack } from 'expo-router';

// RecordingPlayerScreen renders its own GradientHeader (with the real Back
// button), same as OnlineClassDetailScreen's own route -- hide the native
// header so there's never a double header.
export default function RecordingPlayerLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
