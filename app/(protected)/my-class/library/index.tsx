// Parent "Library" -- pixel-matched to the design reference's isLibrary block
// (issued/due-soon/fine stat card, Borrowed/History/Search segmented tabs), wired
// to the real backend (school-eos-backend's parent-library.controller.ts). No
// renew action here -- the backend only exposes a read-only summary and a catalog
// search, not a renew endpoint, so borrowed rows show real due/overdue state
// rather than a button nothing backs. `hasLibraryCard: false` is a real, common
// state (child has no library membership yet), not an error -- shown as an honest
// banner, never a crash.

import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Svg, { Circle, Path } from 'react-native-svg';
import { AppHeader } from '@/components/AppHeader';
import { useSelectedChild } from '@/hooks/useSelectedChild';
import { formatDate, formatMoneySummary } from '@/lib/format';
import { getLibrarySummary, searchLibraryCatalog, type LibraryBook, type LibraryIssueRow } from '@/lib/parent-api';
import { cardShadow, parentColors } from '@/lib/theme';

type LibraryTab = 'borrowed' | 'history' | 'search';

const TABS: { key: LibraryTab; label: string }[] = [
  { key: 'borrowed', label: 'Borrowed' },
  { key: 'history', label: 'History' },
  { key: 'search', label: 'Search' },
];

function extractErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

function SearchIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={parentColors.muted} strokeWidth={2}>
      <Circle cx={11} cy={11} r={7} />
      <Path d="M20 20l-3.5-3.5" />
    </Svg>
  );
}

function BorrowedRow({ book }: { book: LibraryIssueRow }) {
  return (
    <View style={[styles.itemCard, cardShadow]}>
      <View style={[styles.cover, { backgroundColor: parentColors.blue }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.itemTitle}>{book.bookTitle}</Text>
        <Text style={styles.itemMeta}>
          Copy {book.copyCode} · Issued {formatDate(book.issuedAt)}
          {book.renewedCount > 0 ? ` · Renewed ${book.renewedCount}x` : ''}
        </Text>
        <Text style={[styles.itemDue, book.isOverdue && styles.itemDueOverdue]}>
          {book.isOverdue
            ? `Overdue by ${book.daysOverdue} day${book.daysOverdue === 1 ? '' : 's'} · Fine ${formatMoneySummary(book.projectedFinePaise)}`
            : `Due ${formatDate(book.dueDate)}`}
        </Text>
      </View>
    </View>
  );
}

function HistoryRow({ book, isLast }: { book: LibraryIssueRow; isLast: boolean }) {
  return (
    <View style={[styles.historyRow, !isLast && styles.historyRowBorder]}>
      <Text style={styles.itemTitle}>{book.bookTitle}</Text>
      <Text style={styles.itemMeta}>Copy {book.copyCode}</Text>
      <Text style={styles.historyMeta}>
        Borrowed {formatDate(book.issuedAt)} · Returned {book.returnedAt ? formatDate(book.returnedAt) : '—'}
      </Text>
    </View>
  );
}

function CatalogRow({ book }: { book: LibraryBook }) {
  const available = book.copiesSummary.available > 0;
  const metaParts = [book.author, book.isbn, book.categoryName].filter(Boolean);
  return (
    <View style={[styles.itemCard, cardShadow]}>
      <View style={[styles.cover, { backgroundColor: parentColors.coverBg }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.itemTitle}>{book.title}</Text>
        <Text style={styles.itemMeta}>{metaParts.length > 0 ? metaParts.join(' · ') : 'No further details'}</Text>
      </View>
      <View style={[styles.statusPill, { backgroundColor: available ? parentColors.greenBg : parentColors.pillNeutralBg }]}>
        <Text style={[styles.statusPillText, { color: available ? parentColors.greenDark : parentColors.ink }]}>
          {available ? `${book.copiesSummary.available} available` : 'All copies issued'}
        </Text>
      </View>
    </View>
  );
}

export default function LibraryScreen() {
  const router = useRouter();
  const { selected, isLoading: childLoading } = useSelectedChild();
  const studentId = selected?.studentId;

  const [tab, setTab] = useState<LibraryTab>('borrowed');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(handle);
  }, [query]);

  const summaryQuery = useQuery({
    queryKey: ['library-summary', studentId],
    queryFn: () => getLibrarySummary(studentId!),
    enabled: !!studentId,
  });

  const searchQuery = useQuery({
    queryKey: ['library-search', studentId, debouncedQuery],
    queryFn: () => searchLibraryCatalog(studentId!, debouncedQuery || undefined),
    enabled: !!studentId && tab === 'search',
  });

  if (childLoading || !selected) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Library" onBack={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator color={parentColors.blue} />
        </View>
      </View>
    );
  }

  const summary = summaryQuery.data;

  return (
    <View style={styles.flex}>
      <AppHeader title="Library" subtitle={selected.studentName} onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={summaryQuery.isFetching} onRefresh={() => summaryQuery.refetch()} />}
      >
        {summaryQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
        ) : summaryQuery.isError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{extractErrorMessage(summaryQuery.error, 'Unable to load the library summary.')}</Text>
            <Pressable style={styles.retryButton} onPress={() => summaryQuery.refetch()}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : summary ? (
          <>
            {!summary.hasLibraryCard ? (
              <View style={styles.noCardBanner}>
                <Text style={styles.noCardTitle}>No library card issued yet</Text>
                <Text style={styles.noCardSubtitle}>Ask the school librarian to issue a card to track borrowed books and fines here.</Text>
              </View>
            ) : null}

            <View style={styles.statsCard}>
              <View>
                <Text style={[styles.statValue, { color: parentColors.blueDeep }]}>{summary.stats.issuedCount}</Text>
                <Text style={styles.statLabel}>Issued</Text>
              </View>
              <View>
                <Text style={styles.statValue}>{summary.stats.dueSoonCount}</Text>
                <Text style={styles.statLabel}>Due soon</Text>
              </View>
              <View>
                <Text style={styles.statValue}>{formatMoneySummary(summary.stats.pendingFinePaise)}</Text>
                <Text style={styles.statLabel}>Fine</Text>
              </View>
            </View>

            <View style={styles.segment}>
              {TABS.map((t) => {
                const active = tab === t.key;
                return (
                  <Pressable key={t.key} style={[styles.segmentBtn, active && styles.segmentBtnActive]} onPress={() => setTab(t.key)}>
                    <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{t.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {tab === 'borrowed' ? (
              summary.borrowed.length === 0 ? (
                <View style={styles.noMatchCard}>
                  <Text style={styles.noMatchTitle}>No books borrowed</Text>
                  <Text style={styles.noMatchSubtitle}>Books currently issued to this child will appear here.</Text>
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  {summary.borrowed.map((b) => (
                    <BorrowedRow key={b.id} book={b} />
                  ))}
                </View>
              )
            ) : null}

            {tab === 'history' ? (
              summary.history.length === 0 ? (
                <View style={styles.noMatchCard}>
                  <Text style={styles.noMatchTitle}>No return history yet</Text>
                  <Text style={styles.noMatchSubtitle}>Books this child has returned will appear here.</Text>
                </View>
              ) : (
                <View style={[styles.historyCard, cardShadow]}>
                  {summary.history.map((r, i) => (
                    <HistoryRow key={r.id} book={r} isLast={i === summary.history.length - 1} />
                  ))}
                </View>
              )
            ) : null}

            {tab === 'search' ? (
              <View style={{ gap: 12 }}>
                <View style={styles.searchBox}>
                  <SearchIcon />
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search title, author or code"
                    placeholderTextColor={parentColors.muted}
                    style={styles.searchInput}
                  />
                </View>
                {searchQuery.isLoading ? (
                  <ActivityIndicator color={parentColors.blue} style={{ marginTop: 12 }} />
                ) : searchQuery.isError ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{extractErrorMessage(searchQuery.error, 'Unable to search the catalogue.')}</Text>
                    <Pressable style={styles.retryButton} onPress={() => searchQuery.refetch()}>
                      <Text style={styles.retryText}>Try again</Text>
                    </Pressable>
                  </View>
                ) : (searchQuery.data?.data ?? []).length === 0 ? (
                  <View style={styles.noMatchCard}>
                    <Text style={styles.noMatchTitle}>No matches</Text>
                    <Text style={styles.noMatchSubtitle}>Try another title, author or code.</Text>
                  </View>
                ) : (
                  (searchQuery.data?.data ?? []).map((book) => <CatalogRow key={book.id} book={book} />)
                )}
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 14, paddingBottom: 32, gap: 12 },

  errorBox: { alignItems: 'center', gap: 12, paddingVertical: 24 },
  errorText: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.redDark, textAlign: 'center' },
  retryButton: { borderWidth: 1, borderColor: parentColors.border, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20 },
  retryText: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },

  noCardBanner: { backgroundColor: parentColors.pillNeutralBg, borderRadius: 14, padding: 14 },
  noCardTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  noCardSubtitle: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.bodyMuted, marginTop: 4, lineHeight: 17 },

  statsCard: {
    backgroundColor: parentColors.pillBlueBg,
    borderRadius: 16,
    padding: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statValue: { fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  statLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.bodyMuted, marginTop: 2 },

  segment: { flexDirection: 'row', backgroundColor: parentColors.segmentTrack, borderRadius: 14, padding: 5 },
  segmentBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 11 },
  segmentBtnActive: { backgroundColor: parentColors.blue },
  segmentText: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.bodyMuted },
  segmentTextActive: { color: '#fff', fontFamily: 'PlusJakartaSans_800ExtraBold' },

  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: parentColors.border,
    padding: 15,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  cover: { width: 36, height: 48, borderRadius: 5, flexShrink: 0 },
  itemTitle: { fontSize: 15.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  itemMeta: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 3 },
  itemDue: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.bodyMuted, marginTop: 5 },
  itemDueOverdue: { color: parentColors.redDark },

  statusPill: { paddingVertical: 6, paddingHorizontal: 11, borderRadius: 99, alignSelf: 'flex-start' },
  statusPillText: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_700Bold' },

  historyCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: parentColors.border, overflow: 'hidden' },
  historyRow: { padding: 14, paddingHorizontal: 16 },
  historyRowBorder: { borderBottomWidth: 1, borderBottomColor: parentColors.borderSoft },
  historyMeta: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.bodyMuted, marginTop: 5 },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: parentColors.fieldBorder,
    borderRadius: 12,
    padding: 12,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.ink, padding: 0 },

  noMatchCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: parentColors.border,
    padding: 26,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  noMatchTitle: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.bodyMuted },
  noMatchSubtitle: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 5, textAlign: 'center' },
});
