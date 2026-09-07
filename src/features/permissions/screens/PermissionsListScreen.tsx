// Permissions ("My class" tab, both roles). Parent sees consent forms to
// sign/review; Faculty sees two tabs -- "Post request" (create a new consent
// request) and "History" (past/active requests, tap through to see who
// responded). Role branching mirrors MessagesListScreen's own use of
// useMe()/hasRole().

import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientHeader } from '@/components/GradientHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/ScreenStates';
import { hasRole, useMe } from '@/hooks/useMe';
import { colors } from '@/lib/theme';
import { FacultyPermissionCardView } from '../components/FacultyPermissionCardView';
import { FacultyPostRequestForm } from '../components/FacultyPostRequestForm';
import { ParentPermissionCardView } from '../components/ParentPermissionCardView';
import { TabSwitcher } from '../components/TabSwitcher';
import { usePermissionActivities, usePermissionRequests } from '../hooks';

export function PermissionsListScreen() {
  const router = useRouter();
  const me = useMe();

  if (me.isLoading) {
    return (
      <View style={styles.screen}>
        <GradientHeader title="Permissions" onBack={() => router.back()} />
        <LoadingState />
      </View>
    );
  }

  const isFaculty = hasRole(me.data?.roles, 'FACULTY');
  return isFaculty ? <FacultyPermissions /> : <ParentPermissions />;
}

function ParentPermissions() {
  const router = useRouter();
  const requests = usePermissionRequests();

  return (
    <View style={styles.screen}>
      <GradientHeader title="Permissions" subtitle="Consent forms to sign" onBack={() => router.back()} />
      {requests.isLoading ? (
        <LoadingState />
      ) : requests.isError ? (
        <ErrorState message="Unable to load your permissions." onRetry={() => requests.refetch()} />
      ) : (requests.data ?? []).length === 0 ? (
        <EmptyState message="No permission requests yet." />
      ) : (
        <FlatList
          data={requests.data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ParentPermissionCardView item={item} />}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

type FacultyTab = 'post' | 'history';

function FacultyPermissions() {
  const router = useRouter();
  const [tab, setTab] = useState<FacultyTab>('post');
  const activities = usePermissionActivities();

  return (
    <View style={styles.screen}>
      <GradientHeader title="Permissions" subtitle="Manage consent requests" onBack={() => router.back()} />
      <TabSwitcher
        tabs={[
          { key: 'post', label: 'Post request' },
          { key: 'history', label: 'History' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'post' ? (
        <FlatList
          data={[{ key: 'form' }]}
          keyExtractor={(item) => item.key}
          renderItem={() => <FacultyPostRequestForm onCreated={() => setTab('history')} />}
        />
      ) : activities.isLoading ? (
        <LoadingState />
      ) : activities.isError ? (
        <ErrorState message="Unable to load your requests." onRetry={() => activities.refetch()} />
      ) : (activities.data ?? []).length === 0 ? (
        <EmptyState message="You haven't posted any requests yet." />
      ) : (
        <FlatList
          data={activities.data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <FacultyPermissionCardView item={item} />}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  listContent: { paddingTop: 16, paddingBottom: 32 },
});
