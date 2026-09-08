// Vice Principal -> Parent detail (Phase 5) -- view-only, real backend data
// only. No relationship modification, no set-primary/revoke -- those live on
// guardian-links.controller.ts, which was never touched and stays ADMIN-only,
// enforced server-side, not just by this screen omitting buttons. Tapping a
// linked student navigates into the REAL Phase 4 Student detail screen
// (vice-principal/students/[id].tsx) -- no student data duplicated here.

import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ScreenStates';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { initialsOf } from '@/lib/format';
import { parentColors } from '@/lib/theme';
import { getParent } from '@/lib/vice-principal-parents-api';

const cardShadow = {
  shadowColor: '#0F172A',
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
};

function parentStatusMeta(status: string): { label: string; tone: StatusTone } {
  switch (status) {
    case 'ACTIVE':
      return { label: 'Active', tone: 'positive' };
    case 'SUSPENDED':
      return { label: 'Suspended', tone: 'warning' };
    default:
      return { label: 'Archived', tone: 'neutral' };
  }
}

function linkStatusMeta(status: string): { label: string; tone: StatusTone } {
  return status === 'ACTIVE' ? { label: 'Active link', tone: 'positive' } : { label: status, tone: 'neutral' };
}

export default function VicePrincipalParentDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const parentQuery = useQuery({ queryKey: ['vp-parents', 'detail', id], queryFn: () => getParent(id) });

  if (parentQuery.isLoading) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Parent" onBack={() => router.back()} />
        <ActivityIndicator color={parentColors.blue} style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (parentQuery.isError || !parentQuery.data) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Parent" onBack={() => router.back()} />
        <ErrorState
          message={parentQuery.error instanceof ApiError ? parentQuery.error.message : "Couldn't load this parent."}
          onRetry={() => parentQuery.refetch()}
        />
      </View>
    );
  }

  const parent = parentQuery.data;
  const meta = parentStatusMeta(parent.status);

  return (
    <View style={styles.flex}>
      <AppHeader title={`${parent.firstName} ${parent.lastName ?? ''}`} subtitle="Parent / guardian" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.identityCard, cardShadow]}>
          {parent.photoUrl ? (
            <Image source={{ uri: parent.photoUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarFallbackText}>{initialsOf(parent.firstName, parent.lastName)}</Text>
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.identityName} numberOfLines={1}>
              {parent.firstName} {parent.lastName ?? ''}
            </Text>
            <Text style={styles.identityMeta}>
              {parent.children.length} {parent.children.length === 1 ? 'child' : 'children'} linked
            </Text>
          </View>
          <StatusBadge {...meta} />
        </View>

        <Text style={styles.sectionTitle}>Contact information</Text>
        <View style={[styles.card, cardShadow]}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{parent.email ?? '—'}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>Mobile</Text>
            <Text style={styles.infoValue}>{parent.mobile ?? '—'}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Linked students</Text>
        {parent.children.length === 0 ? (
          <View style={[styles.card, cardShadow]}>
            <Text style={styles.standaloneValue}>No linked students on record.</Text>
          </View>
        ) : (
          <View style={[styles.card, cardShadow]}>
            {parent.children.map((child, index) => {
              const linkMeta = linkStatusMeta(child.status);
              return (
                <Pressable
                  key={child.id}
                  style={[styles.studentRow, index > 0 && styles.infoRowBorder]}
                  onPress={() => router.push(`/(protected)/vice-principal/students/${child.studentId}` as never)}
                >
                  {child.studentPhotoUrl ? (
                    <Image source={{ uri: child.studentPhotoUrl }} style={styles.studentAvatarImage} />
                  ) : (
                    <View style={styles.studentAvatarFallback}>
                      <Text style={styles.studentAvatarFallbackText}>
                        {initialsOf(child.studentFirstName, child.studentLastName)}
                      </Text>
                    </View>
                  )}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.infoValue} numberOfLines={1}>
                      {child.studentFirstName} {child.studentLastName ?? ''}
                    </Text>
                    <Text style={styles.infoLabel} numberOfLines={1}>
                      {child.studentAdmissionNo}
                      {child.gradeName ? ` · ${child.gradeName}${child.sectionName ? ` ${child.sectionName}` : ''}` : ''}
                      {' · '}
                      {child.relationship}
                      {child.isPrimaryContact ? ' · Primary' : ''}
                    </Text>
                  </View>
                  <StatusBadge {...linkMeta} />
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 32 },
  identityCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 6,
  },
  avatarImage: { width: 54, height: 54, borderRadius: 27, backgroundColor: parentColors.borderSoft },
  avatarFallback: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: parentColors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#fff' },
  identityName: { fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  identityMeta: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
  sectionTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink, marginTop: 18, marginBottom: 10 },
  card: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16 },
  infoRow: { paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  infoRowBorder: { borderTopWidth: 1, borderTopColor: parentColors.borderSoft },
  infoLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted },
  infoValue: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  standaloneValue: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink, paddingVertical: 14 },
  studentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  studentAvatarImage: { width: 40, height: 40, borderRadius: 20, backgroundColor: parentColors.borderSoft },
  studentAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: parentColors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentAvatarFallbackText: { fontSize: 12, fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#fff' },
});
