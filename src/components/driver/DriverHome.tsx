// Driver -- Home tab. Header row matches the same greeting-card pattern
// already built for Faculty (FacultyHome.tsx) and Parent (ParentHome.tsx) --
// avatar + "Hi, {name}" + role meta line, plus the same AI-chat quick-access
// icon both of those Homes already have. Below the header: Notices + Media
// Room, then a real dashboard (not just a menu list) built from GET
// /driver/dashboard -- today's trip status for both directions with
// Start/Complete controls, attendance progress, a licence/verification
// expiry alert (only shown when actually due/expired), and the bus/route
// summary, all read-only here. My Students/My Bus/My Profile are reached
// ONLY via the bottom tab bar (BottomTabBar.tsx's DRIVER_TABS) -- no
// duplicate menu tiles or card taps to the same destinations on this screen.
// Only DriverHome.tsx changes here; FacultyHome.tsx and ParentHome.tsx are
// untouched. Uses parentColors (the shared neutral token set) rather than
// inventing a new Driver theme, since this role has no design file yet.

import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle } from 'react-native-svg';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { listAnnouncements } from '@/lib/vice-principal-dashboard-api';
import { listPublishedMediaPosts } from '@/lib/faculty-media-posts-api';
import {
  completeTrip,
  DIRECTION_HELP,
  DIRECTION_LABEL,
  DRIVER_DASHBOARD_KEY,
  daysUntil,
  expiryLabel,
  getDashboard,
  startTrip,
  todayLabel,
  tripAction,
  tripStatusText,
  tripTone,
  type TripDirection,
} from '@/lib/driver-api';
import { StatusBadge } from '@/components/StatusBadge';
import { parentColors, cardShadow } from '@/lib/theme';

// Same gradient-bar header as FacultyHome.tsx (school badge + name + bell/
// chat icons), exact same icon shapes -- kept local here rather than
// imported since FacultyHome's own icons aren't exported, and this file must
// not change FacultyHome.tsx itself.
function BellIcon() {
  return (
    <Svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <Path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </Svg>
  );
}
function PersonIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={parentColors.blue} strokeWidth={1.8} strokeLinecap="round">
      <Circle cx={12} cy={8} r={3.5} />
      <Path d="M5 20c0-4 3-6.5 7-6.5s7 2.5 7 6.5" />
    </Svg>
  );
}


const DIRECTIONS: TripDirection[] = ['PICKUP', 'DROP'];

export function DriverHome({ personName, onSignOut }: { personName: string; onSignOut: () => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [noticeIndex, setNoticeIndex] = useState(0);

  // Polled (not just fetched once) so a real NFC card tap -- the primary
  // attendance path, this whole screen's trip/attendance cards are just a
  // live view onto the same real data -- shows up here within seconds
  // without the driver needing to pull-to-refresh. Same reasoning as
  // DriverStudentsScreen's own polling.
  const dashboardQuery = useQuery({ queryKey: DRIVER_DASHBOARD_KEY, queryFn: getDashboard, refetchInterval: 10_000 });
  const data = dashboardQuery.data;

  // Same real Notices (GET /announcements?roleCode=DRIVER) and Media Room
  // (GET /media/posts?state=PUBLISHED) feeds Faculty/Parent/Principal's own
  // Home already read -- see announcements.controller.ts / media-posts.
  // controller.ts's own @Roles history for the DRIVER grant.
  const noticesQuery = useQuery({
    queryKey: ['driver', 'notices'],
    queryFn: () => listAnnouncements({ roleCode: 'DRIVER' }),
  });
  const mediaQuery = useQuery({ queryKey: ['driver', 'media-posts'], queryFn: listPublishedMediaPosts });
  const notices = (noticesQuery.data ?? []).slice(0, 5);
  const activeNotice = notices[noticeIndex % Math.max(notices.length, 1)];
  const latestPost = (mediaQuery.data ?? [])[0] ?? null;

  const tripMutation = useMutation({
    mutationFn: ({ direction, action }: { direction: TripDirection; action: 'start' | 'complete' }) =>
      action === 'start' ? startTrip(direction) : completeTrip(direction),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DRIVER_DASHBOARD_KEY }),
    onError: (err) => Alert.alert('Could not update trip', err instanceof ApiError ? err.message : 'Please try again.'),
  });

  const expiryAlerts = data
    ? [
        { label: 'Licence', dateIso: data.profile.licenceExpiry },
        ...(data.profile.verificationExpiry
          ? [{ label: 'Police verification', dateIso: data.profile.verificationExpiry }]
          : []),
      ]
        .map((a) => ({ ...a, days: daysUntil(a.dateIso) }))
        .filter((a) => a.days <= 30)
    : [];

  return (
    <View style={styles.flex}>
      <LinearGradient colors={['#1E3FAE', '#2563EB']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <SafeAreaView edges={['top']}>
          <View style={styles.gradientHeaderRow}>
            <View style={styles.gradientHeaderLeft}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>PP</Text>
              </View>
              <Text style={styles.schoolName}>Pavakie Public School</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {/* AI chat entry point removed here -- Driver is deliberately
                  excluded from the AI assistant (a device-credential-style
                  operational login, no person-facing school-records
                  assistant use case), matching the global AskAiFab's own
                  exclusion in app/(protected)/_layout.tsx. */}
              <View style={styles.bellWrap}>
                <BellIcon />
                <View style={styles.bellDot} />
              </View>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={dashboardQuery.isFetching} onRefresh={() => dashboardQuery.refetch()} />}
      >
        <View style={styles.greetingCard}>
          <View style={styles.avatar}>
            <PersonIcon />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.greetingName} numberOfLines={1}>Hi, {personName}</Text>
            <Text style={styles.greetingMeta}>Driver</Text>
          </View>
        </View>

        <View style={styles.body}>
        <View style={{ gap: 10 }}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="megaphone-outline" size={18} color={parentColors.ink} />
            <Text style={styles.sectionTitle}>Notice</Text>
            <Pressable onPress={() => router.push('/(protected)/driver/notices' as never)}>
              <Text style={styles.viewAll}>View All</Text>
            </Pressable>
          </View>

          {noticesQuery.isLoading ? (
            <ActivityIndicator color={parentColors.blue} />
          ) : activeNotice ? (
            <>
              <Pressable style={styles.noticeCard} onPress={() => router.push('/(protected)/driver/notices' as never)}>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={styles.noticeTitle} numberOfLines={2}>{activeNotice.title}</Text>
                  {activeNotice.category ? <Text style={styles.noticeMeta}>{activeNotice.category}</Text> : null}
                  <Text style={styles.noticeMeta}>{formatDate(activeNotice.createdAt)}</Text>
                </View>
                {notices.length > 1 ? (
                  <Pressable
                    style={styles.noticeChevron}
                    onPress={(e) => {
                      e.stopPropagation();
                      setNoticeIndex((i) => (i + 1) % notices.length);
                    }}
                  >
                    <Ionicons name="chevron-forward" size={18} color={parentColors.blue} />
                  </Pressable>
                ) : null}
              </Pressable>
              {notices.length > 1 ? (
                <View style={styles.dotsRow}>
                  {notices.map((n, i) => (
                    <Pressable key={n.id} onPress={() => setNoticeIndex(i)}>
                      <View style={[styles.dot, i === noticeIndex % notices.length ? styles.dotActive : styles.dotInactive]} />
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </>
          ) : (
            <Text style={styles.errorText}>No notices yet.</Text>
          )}
        </View>

        {mediaQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} />
        ) : latestPost ? (
          <View style={[styles.card, cardShadow]}>
            <View style={styles.mediaTopRow}>
              <View style={styles.mediaBadgeSmall}>
                <Text style={styles.mediaBadgeSmallText}>PP</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mediaSchool}>Pavakie Public School</Text>
                <Text style={styles.mediaMeta}>Media Room · {formatDate(latestPost.createdAt)}</Text>
              </View>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{latestPost.category}</Text>
              </View>
            </View>
            <Text style={styles.mediaCaption}>{latestPost.caption}</Text>
            {latestPost.firstComment ? <Text style={styles.mediaBody}>{latestPost.firstComment}</Text> : null}
            {latestPost.assets[0] ? (
              <Image source={{ uri: latestPost.assets[0].url }} style={styles.mediaImage} resizeMode="cover" />
            ) : null}
          </View>
        ) : null}

        {dashboardQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
        ) : dashboardQuery.isError ? (
          <Text style={styles.errorText}>Unable to load your dashboard.</Text>
        ) : data ? (
          <>
            {expiryAlerts.map((a) => (
              <View key={a.label} style={[styles.alertCard, cardShadow]}>
                <Ionicons name="alert-circle-outline" size={20} color={a.days < 0 ? '#B33A2E' : '#B77A0A'} />
                <Text style={styles.alertText}>
                  {a.label} {a.days < 0 ? 'has expired' : `expires in ${a.days}d`} — {expiryLabel(a.dateIso, a.days)}
                </Text>
              </View>
            ))}

            <View style={{ gap: 10 }}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Today&apos;s trips</Text>
                <View style={styles.dateRow}>
                  <Ionicons name="calendar-outline" size={13} color={parentColors.blueDeep} />
                  <Text style={styles.dateText}>{todayLabel()}</Text>
                </View>
              </View>
              {DIRECTIONS.map((key) => {
                const trip = data.trips[key];
                const action = tripAction(trip?.state);
                const busy = tripMutation.isPending && tripMutation.variables?.direction === key;
                return (
                  <View key={key} style={[styles.tripCard, cardShadow]}>
                    <View style={styles.tripCardTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.tripLabel}>{DIRECTION_LABEL[key]}</Text>
                        <Text style={styles.tripHelper}>{DIRECTION_HELP[key]}</Text>
                      </View>
                      <StatusBadge label={tripStatusText(trip?.state)} tone={tripTone(trip?.state)} />
                    </View>

                    {busy ? (
                      <View style={styles.tripActionBtn}>
                        <ActivityIndicator color="#fff" size="small" />
                      </View>
                    ) : action === 'complete' ? (
                      <Pressable
                        style={[styles.tripActionBtn, styles.tripActionComplete]}
                        onPress={() => tripMutation.mutate({ direction: key, action: 'complete' })}
                      >
                        <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                        <Text style={styles.tripActionText}>Complete trip</Text>
                      </Pressable>
                    ) : action === 'start' ? (
                      <Pressable
                        style={[styles.tripActionBtn, styles.tripActionStart]}
                        onPress={() => tripMutation.mutate({ direction: key, action: 'start' })}
                      >
                        <Ionicons name="play-circle-outline" size={18} color="#fff" />
                        <Text style={styles.tripActionText}>Start trip</Text>
                      </Pressable>
                    ) : (
                      <View style={styles.tripDoneRow}>
                        <Ionicons
                          name={trip?.state === 'COMPLETED' ? 'checkmark-circle' : 'close-circle'}
                          size={16}
                          color={trip?.state === 'COMPLETED' ? '#1E8A4C' : '#B33A2E'}
                        />
                        <Text style={styles.tripDoneText}>
                          {trip?.state === 'COMPLETED' ? 'Nothing more to do for this trip.' : 'This trip cannot be started again.'}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            <View style={[styles.card, cardShadow]}>
              <Text style={styles.cardTitle}>Attendance today</Text>
              {DIRECTIONS.map((key) => {
                const a = data.attendance[key];
                return (
                  <View key={key} style={styles.attendanceRow}>
                    <Text style={styles.tripLabel}>{DIRECTION_LABEL[key]}</Text>
                    <Text style={styles.attendanceCount}>{a.marked} / {a.total} marked</Text>
                  </View>
                );
              })}
            </View>

            {data.bus ? (
              <View style={[styles.card, cardShadow]}>
                <Text style={styles.cardTitle}>My bus</Text>
                <Text style={styles.busLine}>{data.bus.registrationNo} · {data.bus.routeName}</Text>
                {data.bus.attendantName ? <Text style={styles.busMeta}>Attendant: {data.bus.attendantName}</Text> : null}
              </View>
            ) : null}
          </>
        ) : null}

        <Pressable onPress={onSignOut} style={styles.button}>
          <Text style={styles.buttonText}>Sign out</Text>
        </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  gradientHeaderRow: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  gradientHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#1E3FAE' },
  schoolName: { color: '#fff', fontSize: 17, fontFamily: 'PlusJakartaSans_700Bold' },
  bellWrap: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  bellDot: { position: 'absolute', top: 4, right: 4, width: 9, height: 9, borderRadius: 4.5, backgroundColor: '#60A5FA', borderWidth: 2, borderColor: '#2563EB' },
  greetingCard: { backgroundColor: '#fff', paddingVertical: 14, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: '#EDF0F6' },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#DBEAFE',
    borderWidth: 2,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingName: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: parentColors.ink },
  greetingMeta: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 13, color: parentColors.muted, marginTop: 2 },
  scrollContent: { paddingBottom: 32 },
  body: { paddingHorizontal: 20, paddingTop: 16, gap: 12 },
  errorText: { textAlign: 'center', color: parentColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 24 },
  alertCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFF7EA', borderRadius: 14, padding: 14 },
  alertText: { flex: 1, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, color: '#7A4B00' },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: parentColors.pillBlueBg,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  dateText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11.5, color: parentColors.blueDeep },
  viewAll: { marginLeft: 'auto', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: parentColors.blue },
  noticeCard: { backgroundColor: parentColors.pillBlueBg, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  noticeTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: parentColors.ink, lineHeight: 20 },
  noticeMeta: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12.5, color: parentColors.mutedSoft },
  noticeChevron: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  dotsRow: { flexDirection: 'row', gap: 5, justifyContent: 'center' },
  dot: { height: 5, borderRadius: 3 },
  dotActive: { width: 18, backgroundColor: parentColors.blue },
  dotInactive: { width: 5, backgroundColor: parentColors.border },
  mediaTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mediaBadgeSmall: { width: 34, height: 34, borderRadius: 9, backgroundColor: parentColors.pillNeutralBg, alignItems: 'center', justifyContent: 'center' },
  mediaBadgeSmallText: { fontSize: 12, fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#1E3FAE' },
  mediaSchool: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  mediaMeta: { fontSize: 11.5, color: parentColors.mutedSoft, marginTop: 2 },
  categoryBadge: { backgroundColor: parentColors.greenBg, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  categoryBadgeText: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.greenDark },
  mediaCaption: { fontSize: 15.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink, marginTop: 12 },
  mediaBody: { fontSize: 13.5, color: parentColors.bodyMuted, lineHeight: 20, marginTop: 8, fontFamily: 'PlusJakartaSans_500Medium' },
  mediaImage: { marginTop: 12, borderRadius: 10, width: '100%', height: 160, backgroundColor: parentColors.borderSoft },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 4 },
  cardTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: parentColors.ink, marginBottom: 6 },
  sectionTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: parentColors.ink },
  tripCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 12 },
  tripCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  tripLabel: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14.5, color: parentColors.ink },
  tripHelper: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12.5, color: parentColors.muted, marginTop: 3, lineHeight: 17 },
  tripActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    paddingVertical: 11,
  },
  tripActionStart: { backgroundColor: parentColors.blue },
  tripActionComplete: { backgroundColor: '#1E8A4C' },
  tripActionText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: '#fff' },
  tripDoneRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tripDoneText: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12.5, color: parentColors.muted },
  attendanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  attendanceCount: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: parentColors.ink },
  busLine: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: parentColors.ink },
  busMeta: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12.5, color: parentColors.muted, marginTop: 2 },
  button: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: parentColors.border,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: parentColors.ink },
});
