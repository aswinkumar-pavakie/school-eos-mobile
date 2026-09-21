// Driver -- My Profile. The driver's own compliance-relevant fields
// (licence/police-verification expiry) so they can see for themselves when
// a renewal is coming up -- same real driver table Transport Manager's own
// crew-card screen already reads, just scoped to the caller's own row. No
// edit here -- correcting these stays a Transport Manager/Admin action.

import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { GradientHeader } from '@/components/GradientHeader';
import { ErrorState } from '@/components/ScreenStates';
import { StatusBadge } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { daysUntil, expiryLabel, expiryTone, getMyProfile } from '@/lib/driver-api';
import { parentColors, cardShadow } from '@/lib/theme';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export function DriverProfileScreen() {
  const router = useRouter();
  const profileQuery = useQuery({ queryKey: ['driver', 'my-profile'], queryFn: getMyProfile });

  // Reached either via router.push (Home's menu tile -- has a real
  // back-stack entry) or router.replace (the bottom tab bar -- no
  // back-stack entry at all, so a plain router.back() silently does
  // nothing). canGoBack() picks the right one either way.
  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/' as never);
  }

  return (
    <View style={styles.flex}>
      <GradientHeader title="My Profile" onBack={goBack} />
      <ScrollView contentContainerStyle={styles.content}>
        {profileQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
        ) : profileQuery.isError ? (
          <ErrorState
            message={profileQuery.error instanceof ApiError ? profileQuery.error.message : 'Unable to load your profile.'}
            onRetry={() => profileQuery.refetch()}
          />
        ) : (
          <>
            <View style={[styles.card, cardShadow]}>
              <Text style={styles.cardTitle}>Details</Text>
              <InfoRow label="Name" value={profileQuery.data!.fullName} />
              <InfoRow label="Phone" value={profileQuery.data!.phone ?? '—'} />
              {profileQuery.data!.bloodGroup ? <InfoRow label="Blood group" value={profileQuery.data!.bloodGroup} /> : null}
              {profileQuery.data!.experienceYears != null ? (
                <InfoRow label="Experience" value={`${profileQuery.data!.experienceYears} years`} />
              ) : null}
            </View>

            <View style={[styles.card, cardShadow]}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>Licence</Text>
                <StatusBadge
                  label={expiryLabel(profileQuery.data!.licenceExpiry, daysUntil(profileQuery.data!.licenceExpiry))}
                  tone={expiryTone(daysUntil(profileQuery.data!.licenceExpiry))}
                />
              </View>
              <InfoRow label="Licence no." value={profileQuery.data!.licenceNo} />
            </View>

            {profileQuery.data!.verificationExpiry ? (
              <View style={[styles.card, cardShadow]}>
                <View style={styles.rowBetween}>
                  <Text style={styles.cardTitle}>Police verification</Text>
                  <StatusBadge
                    label={expiryLabel(profileQuery.data!.verificationExpiry, daysUntil(profileQuery.data!.verificationExpiry))}
                    tone={expiryTone(daysUntil(profileQuery.data!.verificationExpiry))}
                  />
                </View>
                {profileQuery.data!.policeVerificationRef ? (
                  <InfoRow label="Reference" value={profileQuery.data!.policeVerificationRef} />
                ) : null}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 4 },
  cardTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: parentColors.ink, marginBottom: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  infoLabel: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, color: parentColors.muted },
  infoValue: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: parentColors.ink },
});
