// Sports Admin -- the one generic "register" card-list layout the design
// reuses for Trials/Injuries/Fixtures/Squads/Sessions/Equipment/etc (its own
// `isRegister` screen block: search + action button + row cards, each with a
// title/sub, a status pill, and a key/value meta list). Built once here, the
// same way the website's own TableCard is the one generic table every
// register screen there renders through.

import { ScrollView, StyleSheet, Text, TextInput, View, RefreshControl } from 'react-native';
import { sportsColors } from '@/lib/theme';
import { Card, EmptyPanel, PrimaryButton, SectionLabel, StatusPill } from './primitives';

export interface RegisterRow {
  key: string;
  title: string;
  sub?: string;
  status?: string;
  metas: { k: string; v: string }[];
  onPress?: () => void;
}

export function RegisterList({
  title,
  countLabel,
  search,
  onSearchChange,
  searchPlaceholder,
  actionLabel,
  onAction,
  rows,
  emptyLabel,
  refreshing,
  onRefresh,
}: {
  title: string;
  countLabel: string;
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  actionLabel?: string;
  onAction?: () => void;
  rows: RegisterRow[];
  emptyLabel: string;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined}
    >
      {actionLabel && onAction ? <PrimaryButton label={actionLabel} onPress={onAction} /> : null}
      {onSearchChange ? (
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            value={search}
            onChangeText={onSearchChange}
            placeholder={searchPlaceholder}
            placeholderTextColor={sportsColors.faint}
            style={styles.searchInput}
          />
        </View>
      ) : null}
      <View style={styles.titleRow}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.count}>{countLabel}</Text>
      </View>
      {rows.length === 0 ? (
        <EmptyPanel label={emptyLabel} />
      ) : (
        rows.map((r) => (
          <Card key={r.key} style={styles.rowCard} onPress={r.onPress}>
            <View style={styles.rowTop}>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.rowTitle}>{r.title}</Text>
                {r.sub ? <Text style={styles.rowSub}>{r.sub}</Text> : null}
              </View>
              {r.status ? <StatusPill label={r.status} /> : null}
            </View>
            {r.metas.length > 0 ? (
              <View style={styles.metaBlock}>
                {r.metas.map((m) => (
                  <View key={m.k} style={styles.metaRow}>
                    <Text style={styles.metaKey}>{m.k}</Text>
                    <Text style={styles.metaValue} numberOfLines={1}>{m.v}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32, gap: 13 },
  searchBox: { borderWidth: 1, borderColor: sportsColors.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchIcon: { color: sportsColors.faint, fontSize: 13 },
  searchInput: { flex: 1, fontSize: 13.5, color: sportsColors.ink, padding: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, paddingTop: 2 },
  title: { flex: 1, fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', color: sportsColors.ink },
  count: { fontSize: 11.5, color: sportsColors.tertiary },
  rowCard: { gap: 12, padding: 16 },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  rowTitle: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: sportsColors.ink, lineHeight: 19 },
  rowSub: { fontSize: 12.5, color: sportsColors.mutedStrong },
  metaBlock: { gap: 7, borderTopWidth: 1, borderTopColor: sportsColors.borderSoft, paddingTop: 11 },
  metaRow: { flexDirection: 'row', gap: 12 },
  metaKey: { flex: 1, fontSize: 12, color: sportsColors.tertiary },
  metaValue: { flex: 1.2, fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: sportsColors.bodyStrong, textAlign: 'right' },
});
