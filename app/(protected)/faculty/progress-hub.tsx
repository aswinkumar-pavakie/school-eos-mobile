// Faculty "Progress" tab -- the real Progress-tab destination in the 5-tab
// bar (Home/Class/Progress/Campus/My Bus). Carries forward the old /erp
// grid's EMPLOYEE_TILES section unchanged -- these were already real,
// already-built self-service features, just relabeled from a section
// header inside one page into their own tab, matching the screenshot
// reference's own Home/Class/Campus/Progress/My Bus structure.

import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { ServiceIcon, type ServiceIconKey } from '@/components/ServiceIcon';
import { facultyColors } from '@/lib/theme';

interface ServiceItem {
  key: ServiceIconKey;
  label: string;
  href: string;
}

// Library moved to Campus (see campus-hub.tsx) -- it's a campus service,
// not a self-service HR/attendance one.
const PROGRESS_TILES: ServiceItem[] = [
  { key: 'myAttendance', label: 'Attendance', href: '/(protected)/faculty/my-attendance' },
  { key: 'myLeave', label: 'Leave', href: '/(protected)/faculty/staff-leave' },
  { key: 'od', label: 'OD', href: '/(protected)/faculty/staff-od' },
  { key: 'payroll', label: 'HR Payroll', href: '/(protected)/faculty/hr-requests' },
  { key: 'payslip', label: 'Payslip', href: '/(protected)/faculty/payslip' },
  { key: 'appraisal', label: 'Appraisal', href: '/(protected)/faculty/appraisal' },
];

export default function FacultyProgressHub() {
  const router = useRouter();
  return (
    <View style={styles.flex}>
      <AppHeader title="Progress" subtitle="Your own attendance, leave & HR" onBack={() => router.replace('/')} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.grid}>
          {PROGRESS_TILES.map((item, i) => (
            <Pressable key={`${item.label}-${i}`} style={styles.item} onPress={() => router.push(item.href as never)}>
              <View style={styles.iconCircle}>
                <ServiceIcon name={item.key} color="#fff" size={26} />
              </View>
              <Text style={styles.itemLabel} numberOfLines={2}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: facultyColors.background },
  content: { padding: 16, paddingBottom: 32 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 18 },
  item: { width: '25%', alignItems: 'center', gap: 8, paddingHorizontal: 3 },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: facultyColors.blueTile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: {
    fontSize: 11.5,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: facultyColors.ink,
    textAlign: 'center',
    lineHeight: 15,
  },
});
