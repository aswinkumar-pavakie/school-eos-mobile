// Community's operational home -- reached via the shared bottom tab bar's ERP
// tab (see erp/index.tsx's redirect and BottomTabBar.tsx's per-role tab
// labels), not a standalone login-time landing page. A simple feature
// launcher grouped into one section, exact same shape as
// hostel-warden/index.tsx -- NOT a dashboard, no counts/analytics invented
// here (those already exist on the website's own dashboard; this is mobile's
// entry point into the same three real workflows).

import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { ServiceIcon, type ServiceIconKey } from '@/components/ServiceIcon';
import { parentColors } from '@/lib/theme';

interface FeatureItem {
  key: ServiceIconKey;
  label: string;
  href: string;
}

const ITEMS: FeatureItem[] = [
  { key: 'proposal', label: 'Proposals', href: '/(protected)/community/proposals' },
  { key: 'activity', label: 'Activities', href: '/(protected)/community/activities' },
  { key: 'announcements', label: 'Announcements', href: '/(protected)/community/announcements' },
  { key: 'communityProfile', label: 'Profile', href: '/(protected)/community/profile' },
];

export default function CommunityHome() {
  const router = useRouter();

  return (
    <View style={styles.flex}>
      <AppHeader title="Community" subtitle="Proposals & activities" onBack={() => router.replace('/')} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.grid}>
          {ITEMS.map((item) => (
            <Pressable key={item.key} style={styles.item} onPress={() => router.push(item.href as never)}>
              <View style={styles.iconCircle}>
                <ServiceIcon name={item.key} color="#fff" />
              </View>
              <Text style={styles.itemLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 18, paddingBottom: 24 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 20,
  },
  item: {
    width: '33.33%',
    alignItems: 'center',
    gap: 9,
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: parentColors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: {
    fontSize: 12.5,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: parentColors.ink,
    textAlign: 'center',
    lineHeight: 16,
  },
});
