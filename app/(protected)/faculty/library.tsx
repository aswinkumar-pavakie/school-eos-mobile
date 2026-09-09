// Library -- wired inside the Faculty login to the already-built Library
// module, real-time. Three tabs: Search (catalogue), Issued to me, History
// -- the design's own fourth "E-resources" tab is dropped, since no
// e-resources concept exists anywhere in this schema (physical library
// only); faking one would mean inventing data.

import { useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { SearchIcon } from '@/components/faculty/icons';
import { searchLibraryBooks, listMyIssues } from '@/lib/faculty-library-api';
import { formatDate } from '@/lib/format';
import { facultyColors } from '@/lib/theme';

type Tab = 'SEARCH' | 'ISSUED' | 'HISTORY';
const TABS: { key: Tab; label: string }[] = [
  { key: 'SEARCH', label: 'Search' },
  { key: 'ISSUED', label: 'Issued to me' },
  { key: 'HISTORY', label: 'History' },
];

export default function LibraryScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('SEARCH');
  const [search, setSearch] = useState('');

  const booksQuery = useQuery({
    queryKey: ['faculty-library-books', search],
    queryFn: () => searchLibraryBooks(search),
    enabled: tab === 'SEARCH',
  });
  const issuedQuery = useQuery({
    queryKey: ['faculty-library-my-issues', 'active'],
    queryFn: () => listMyIssues(),
    enabled: tab === 'ISSUED' || tab === 'HISTORY',
  });

  const activeIssues = (issuedQuery.data?.data ?? []).filter((i) => i.status === 'ISSUED' || i.status === 'OVERDUE');
  const history = (issuedQuery.data?.data ?? []).filter((i) => i.status === 'RETURNED' || i.status === 'LOST');

  return (
    <View style={styles.flex}>
      <AppHeader title="Library" subtitle="Catalogue & my books" onBack={() => router.replace('/erp' as never)} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={booksQuery.isFetching || issuedQuery.isFetching} onRefresh={() => (tab === 'SEARCH' ? booksQuery.refetch() : issuedQuery.refetch())} />}
      >
        <View style={styles.tabRow}>
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <Pressable key={t.key} style={[styles.tabChip, active && styles.tabChipActive]} onPress={() => setTab(t.key)}>
                <Text style={[styles.tabChipText, active && { color: '#fff' }]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {tab === 'SEARCH' ? (
          <>
            <View style={styles.searchBox}>
              <SearchIcon />
              <TextInput value={search} onChangeText={setSearch} placeholder="Search by book, author or subject" style={styles.searchInput} />
            </View>
            <Text style={styles.sectionLabel}>CATALOGUE</Text>
            {booksQuery.isLoading ? (
              <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 16 }} />
            ) : (booksQuery.data?.data ?? []).length === 0 ? (
              <Text style={styles.emptyText}>No titles match</Text>
            ) : (
              <View style={{ gap: 10 }}>
                {(booksQuery.data?.data ?? []).map((b) => (
                  <View key={b.id} style={styles.card}>
                    <Text style={styles.cardTitle}>{b.title}</Text>
                    <Text style={styles.cardMeta}>{b.author}</Text>
                    <Text style={styles.cardCode}>{b.categoryName ?? 'Uncategorized'} · {b.copiesSummary.available}/{b.copiesSummary.total} available</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : tab === 'ISSUED' ? (
          <>
            <Text style={styles.sectionLabel}>ISSUED TO ME</Text>
            {issuedQuery.isLoading ? (
              <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 16 }} />
            ) : !issuedQuery.data?.hasLibraryCard ? (
              <Text style={styles.emptyText}>You do not have a library membership yet.</Text>
            ) : activeIssues.length === 0 ? (
              <Text style={styles.emptyText}>Nothing currently issued to you.</Text>
            ) : (
              <View style={{ gap: 10 }}>
                {activeIssues.map((r) => (
                  <View key={r.id} style={styles.card}>
                    <Text style={styles.cardTitle}>{r.bookTitle}</Text>
                    <Text style={styles.cardMeta}>Copy {r.copyCode} · Due {formatDate(r.dueDate)}</Text>
                    <Text style={[styles.cardRight, r.isOverdue && { color: facultyColors.redDark }]}>
                      {r.isOverdue ? `Overdue by ${r.daysOverdue} day${r.daysOverdue === 1 ? '' : 's'}` : 'On time'}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          <>
            <Text style={styles.sectionLabel}>RETURNED</Text>
            {issuedQuery.isLoading ? (
              <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 16 }} />
            ) : !issuedQuery.data?.hasLibraryCard ? (
              <Text style={styles.emptyText}>You do not have a library membership yet.</Text>
            ) : history.length === 0 ? (
              <Text style={styles.emptyText}>No past issues yet.</Text>
            ) : (
              <View style={{ gap: 10 }}>
                {history.map((r) => (
                  <View key={r.id} style={styles.card}>
                    <Text style={styles.cardTitle}>{r.bookTitle}</Text>
                    <Text style={styles.cardMeta}>Copy {r.copyCode} · Issued {formatDate(r.issuedAt)}</Text>
                    <Text style={styles.cardRight}>{r.status === 'LOST' ? 'Marked lost' : r.returnedAt ? `Returned ${formatDate(r.returnedAt)}` : '—'}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: facultyColors.background },
  content: { padding: 14, paddingBottom: 32, gap: 12 },
  tabRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  tabChip: { borderRadius: 999, paddingVertical: 9, paddingHorizontal: 15, backgroundColor: '#fff', borderWidth: 1, borderColor: facultyColors.borderLight },
  tabChipActive: { backgroundColor: facultyColors.blue, borderColor: facultyColors.blue },
  tabChipText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.bodyMuted },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: facultyColors.borderLight, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 12 },
  searchInput: { flex: 1, fontSize: 14, color: facultyColors.ink },
  sectionLabel: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.muted, letterSpacing: 1.2, marginTop: 6, marginLeft: 4 },
  emptyText: { textAlign: 'center', color: facultyColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 16, backgroundColor: facultyColors.surface, borderWidth: 1, borderStyle: 'dashed', borderColor: facultyColors.borderLight, borderRadius: 16, paddingVertical: 26 },
  card: { backgroundColor: facultyColors.surface, borderWidth: 1, borderColor: facultyColors.border, borderRadius: 16, padding: 15 },
  cardTitle: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink, lineHeight: 19 },
  cardMeta: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted, marginTop: 5 },
  cardCode: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.blue, marginTop: 8 },
  cardRight: { fontSize: 12, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.mutedStrong, marginTop: 8 },
});
