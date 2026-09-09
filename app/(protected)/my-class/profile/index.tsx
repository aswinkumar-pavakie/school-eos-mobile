// Profile -- avatar-tap destination from ParentHome. Pixel-matched to "ERP screen
// design choice/School App.dc.html"'s own isProfile block, adapted to what the
// real backend actually exposes: no "house"/faction pill (no such concept in this
// schema) and no parent/guardian rows (a different concern, and no address is
// exposed to Parent by this API). Photo is real (getStudentProfile's photoUrl)
// but null for essentially every student today -- the initial-letter avatar
// fallback (same pattern as ParentHome's own avatar) is the realistic default
// render path, not a rare edge case. Bus route reuses the real Bus feature's own
// getBusAllocation, gracefully showing "--" when the child has no allocation.

import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { useSelectedChild } from '@/hooks/useSelectedChild';
import { formatDate } from '@/lib/format';
import { getBusAllocation, getStudentProfile, type StudentProfile } from '@/lib/parent-api';
import { parentColors } from '@/lib/theme';

function extractErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

function computeAgeYears(dateOfBirth: string): number | null {
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const hadBirthdayThisYear =
    now.getMonth() > dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
  if (!hadBirthdayThisYear) age -= 1;
  return age;
}

function InfoSection({ title, rows }: { title: string; rows: { label: string; value: string }[] }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>
        {rows.map((row, i) => (
          <View key={row.label} style={[styles.infoRow, i > 0 && styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>{row.label}</Text>
            <Text style={styles.infoValue}>{row.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ProfileBody({
  profile,
  busRouteName,
  busStopName,
}: {
  profile: StudentProfile;
  busRouteName: string | null;
  busStopName: string | null;
}) {
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
  const initial = profile.firstName.trim()[0]?.toUpperCase() ?? '?';
  const classLine = [
    profile.gradeName,
    profile.sectionName ? `Section ${profile.sectionName}` : null,
    profile.rollNo != null ? `Roll ${profile.rollNo}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const age = profile.dateOfBirth ? computeAgeYears(profile.dateOfBirth) : null;

  return (
    <View style={{ gap: 18 }}>
      <View style={styles.header}>
        <View style={styles.photoWrap}>
          {profile.photoUrl ? (
            <Image source={{ uri: profile.photoUrl }} style={styles.photo} resizeMode="cover" />
          ) : (
            <Text style={styles.photoInitial}>{initial}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          {classLine ? <Text style={styles.classLine}>{classLine}</Text> : null}
          <View style={styles.pillRow}>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{profile.admissionNo}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCol}>
          <Text style={[styles.statValue, { color: parentColors.blueDeep }]}>{profile.bloodGroup ?? '—'}</Text>
          <Text style={styles.statLabel}>Blood group</Text>
        </View>
        <View style={[styles.statCol, { alignItems: 'center' }]}>
          <Text style={styles.statValue}>{age !== null ? `${age} yrs` : '—'}</Text>
          <Text style={styles.statLabel}>{profile.dateOfBirth ? formatDate(profile.dateOfBirth) : '—'}</Text>
        </View>
        <View style={[styles.statCol, { alignItems: 'flex-end' }]}>
          <Text style={styles.statValue} numberOfLines={1}>{busRouteName ?? '—'}</Text>
          <Text style={styles.statLabel} numberOfLines={1}>{busStopName ?? 'Bus route'}</Text>
        </View>
      </View>

      <View style={styles.sections}>
        <InfoSection
          title="School"
          rows={[
            { label: 'Admission no', value: profile.admissionNo },
            { label: 'Grade', value: profile.gradeName ?? '—' },
            { label: 'Section', value: profile.sectionName ?? '—' },
            { label: 'Medium', value: profile.mediumName ?? '—' },
          ]}
        />
        <InfoSection
          title="Personal"
          rows={[
            { label: 'Date of birth', value: profile.dateOfBirth ? formatDate(profile.dateOfBirth) : '—' },
            { label: 'Gender', value: profile.gender ?? '—' },
            { label: 'Blood group', value: profile.bloodGroup ?? '—' },
          ]}
        />
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { selected, isLoading: childLoading } = useSelectedChild();
  const studentId = selected?.studentId;

  const profileQuery = useQuery({
    queryKey: ['parent-profile', studentId],
    queryFn: () => getStudentProfile(studentId!),
    enabled: !!studentId,
  });
  const busQuery = useQuery({
    queryKey: ['parent-profile-bus', studentId],
    queryFn: () => getBusAllocation(studentId!),
    enabled: !!studentId,
  });

  if (childLoading || !selected) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Profile" onBack={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator color={parentColors.blue} />
        </View>
      </View>
    );
  }

  const profile = profileQuery.data;
  const subtitle = profile ? [profile.gradeName, profile.sectionName].filter(Boolean).join(' · ') : undefined;

  return (
    <View style={styles.flex}>
      <AppHeader title="Profile" subtitle={subtitle} onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={profileQuery.isFetching || busQuery.isFetching}
            onRefresh={() => {
              profileQuery.refetch();
              busQuery.refetch();
            }}
          />
        }
      >
        {profileQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
        ) : profileQuery.isError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{extractErrorMessage(profileQuery.error, 'Unable to load the profile.')}</Text>
            <Pressable style={styles.retryButton} onPress={() => profileQuery.refetch()}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : profile ? (
          <ProfileBody
            profile={profile}
            busRouteName={busQuery.data?.routeName ?? null}
            busStopName={busQuery.data?.stopName ?? null}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 32 },

  errorBox: { alignItems: 'center', gap: 12, paddingVertical: 24, paddingHorizontal: 20 },
  errorText: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.redDark, textAlign: 'center' },
  retryButton: { borderWidth: 1, borderColor: parentColors.border, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20 },
  retryText: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: parentColors.background,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 22,
    borderBottomWidth: 1,
    borderBottomColor: parentColors.borderSoft,
  },
  photoWrap: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 3,
    borderColor: parentColors.white,
    backgroundColor: parentColors.pillBlueBg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
    shadowColor: parentColors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 6,
  },
  photo: { width: '100%', height: '100%' },
  photoInitial: { fontSize: 28, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.blueDeep },
  name: { fontSize: 22, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  classLine: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.classLineMuted, marginTop: 4 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  pill: { backgroundColor: parentColors.pillBlueBg, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 99 },
  pillText: { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.blueDeep },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: parentColors.borderSoft,
  },
  statCol: { flex: 1 },
  statValue: { fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  statLabel: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 3 },

  sections: { paddingHorizontal: 20, gap: 18 },
  sectionTitle: {
    fontSize: 11.5,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    letterSpacing: 1.2,
    color: parentColors.mutedLight,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  sectionCard: {
    backgroundColor: parentColors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: parentColors.borderSoft,
    overflow: 'hidden',
  },
  infoRow: { paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  infoRowBorder: { borderTopWidth: 1, borderTopColor: parentColors.borderSoft },
  infoLabel: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, width: 120, flexShrink: 0 },
  infoValue: { flex: 1, fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink, textAlign: 'right' },
});
