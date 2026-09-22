import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, fonts } from '@/lib/theme';
import { hasRole, useMe } from '@/hooks/useMe';
import { OnlineClassCard } from '../components/OnlineClassCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { EmptyState, ErrorState, LoadingState } from '@/components/ScreenStates';
import { useOnlineClassesList } from '../hooks';
import type { FacultyOnlineClass, OnlineClassView, ParentOnlineClass } from '../types';
import { canAttemptJoin, VIEW_TABS } from '../utils';
import { ApiError } from '@/lib/api';

export function OnlineClassesListScreen() {
  const router = useRouter();
  const [view, setView] = useState<OnlineClassView>('upcoming');
  const me = useMe();
  const isFaculty = hasRole(me.data?.roles, 'FACULTY');

  const list = useOnlineClassesList(view);

  function openCall(id: string) {
    router.push(`/(protected)/online-class-call/${id}` as never);
  }

  function openRecording(id: string) {
    router.push(`/(protected)/recording-player/${id}` as never);
  }

  function renderActions(item: FacultyOnlineClass | ParentOnlineClass) {
    if (isFaculty) {
      const facultyItem = item as FacultyOnlineClass;
      if (facultyItem.status === 'LIVE') {
        return <PrimaryButton label="Resume" size="compact" onPress={() => openCall(facultyItem.id)} />;
      }
      if (facultyItem.status === 'SCHEDULED') {
        return <PrimaryButton label="Start" size="compact" onPress={() => openCall(facultyItem.id)} />;
      }
      if (facultyItem.status === 'COMPLETED' && facultyItem.recordingUrl) {
        return (
          <PrimaryButton
            label="Recording"
            size="compact"
            variant="outline"
            onPress={() => openRecording(facultyItem.id)}
          />
        );
      }
      return null;
    }

    const parentItem = item as ParentOnlineClass;
    if (canAttemptJoin(parentItem)) {
      return <PrimaryButton label="Join" size="compact" onPress={() => openCall(parentItem.id)} />;
    }
    if (parentItem.status === 'COMPLETED' && parentItem.recordingUrl) {
      return (
        <PrimaryButton
          label="Recording"
          size="compact"
          variant="outline"
          onPress={() => openRecording(parentItem.id)}
        />
      );
    }
    if (parentItem.status === 'DRAFT' || parentItem.status === 'SCHEDULED') {
      return <PrimaryButton label="Not open yet" size="compact" variant="outline" disabled onPress={() => {}} />;
    }
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Online Classes</Text>
        {isFaculty ? (
          <Pressable style={styles.scheduleButton} onPress={() => router.push('/(protected)/online-classes/schedule')}>
            <Text style={styles.scheduleButtonText}>+ Schedule</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.tabs}>
        {VIEW_TABS.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setView(tab.key)}
            style={[styles.tab, view === tab.key && styles.tabActive]}
          >
            <Text style={[styles.tabLabel, view === tab.key && styles.tabLabelActive]}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>

      {list.isLoading || me.isLoading ? (
        <LoadingState />
      ) : list.isError ? (
        <ErrorState
          message={list.error instanceof ApiError ? list.error.message : 'Unable to load online classes.'}
          onRetry={() => list.refetch()}
        />
      ) : list.data && list.data.length > 0 ? (
        <FlatList
          data={list.data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          onRefresh={() => list.refetch()}
          refreshing={list.isRefetching}
          renderItem={({ item }) => (
            <OnlineClassCard
              item={item}
              actions={renderActions(item)}
              onPress={() => router.push(`/(protected)/online-classes/${item.id}`)}
            />
          )}
        />
      ) : (
        <EmptyState message={`No ${view} online classes.`} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  title: { fontFamily: fonts.extraBold, fontSize: 22, color: colors.text },
  scheduleButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  scheduleButtonText: { fontFamily: fonts.bold, fontSize: 13, color: colors.white },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted },
  tabLabelActive: { color: colors.white, fontFamily: fonts.bold },
  listContent: { paddingHorizontal: 20, paddingBottom: 24, gap: 12 },
});
