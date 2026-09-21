// Sports Admin -> Students (school-wide roster, real listStudents()) --
// same backend endpoint every other role's student search already uses.

import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { sportsColors } from '@/lib/theme';
import { SportsSubHeader } from '@/components/sports/primitives';
import { RegisterList, type RegisterRow } from '@/components/sports/RegisterList';
import { listStudents } from '@/lib/sports-api';

export default function StudentsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const studentsQuery = useQuery({
    queryKey: ['sports-students', search],
    queryFn: () => listStudents({ search: search.trim() || undefined }),
  });

  const rows: RegisterRow[] = (studentsQuery.data?.data ?? []).map((s) => ({
    key: s.id,
    title: `${s.firstName} ${s.lastName ?? ''}`.trim(),
    sub: [s.gradeName, s.sectionName].filter(Boolean).join(' · ') || undefined,
    status: s.status === 'ACTIVE' ? 'active' : 'inactive',
    metas: [{ k: 'Admission no.', v: s.admissionNo }],
    onPress: () => router.push(`/sports/students/${s.id}` as never),
  }));

  return (
    <View style={{ flex: 1, backgroundColor: sportsColors.surface }}>
      <SportsSubHeader title="Students" onBack={() => router.back()} />
      <RegisterList
        title="School roster"
        countLabel={`${studentsQuery.data?.meta.total ?? 0} students`}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or admission no."
        rows={rows}
        emptyLabel="No students match this search."
        refreshing={studentsQuery.isFetching}
        onRefresh={() => studentsQuery.refetch()}
      />
    </View>
  );
}
