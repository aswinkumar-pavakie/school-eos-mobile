// Principal -> Academics -- school-level academic-structure oversight, real
// backend data only. All four Academics endpoints (academic-years/subjects/
// mediums/departments) confirmed identical class-level access for PRINCIPAL
// as VICE_PRINCIPAL by direct backend audit (see principal-academics-api.ts's
// own comment). Grades/Sections reuse the same /grades /sections calls;
// Faculty reuses listFaculty to resolve a department's Head of Department
// name -- no duplicate API anywhere. Deliberately a single overview screen,
// not a list->detail architecture -- this is small, mostly-static reference
// data, not a large record set like Students/Parents/Faculty.

import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { StatusBadge } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { parentColors } from '@/lib/theme';
import {
  listAcademicYears,
  listDepartments,
  listMediums,
  listSubjects,
} from '@/lib/principal-academics-api';
import { listFaculty } from '@/lib/principal-faculty-api';
import { listGrades, listSections } from '@/lib/principal-students-api';

const cardShadow = {
  shadowColor: '#0F172A',
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
};

export default function PrincipalAcademicsScreen() {
  const router = useRouter();

  const yearsQuery = useQuery({ queryKey: ['principal-academics', 'years'], queryFn: listAcademicYears });
  const gradesQuery = useQuery({ queryKey: ['principal-academics', 'grades'], queryFn: listGrades });
  const sectionsQuery = useQuery({ queryKey: ['principal-academics', 'sections'], queryFn: () => listSections() });
  const subjectsQuery = useQuery({ queryKey: ['principal-academics', 'subjects'], queryFn: listSubjects });
  const departmentsQuery = useQuery({ queryKey: ['principal-academics', 'departments'], queryFn: listDepartments });
  const mediumsQuery = useQuery({ queryKey: ['principal-academics', 'mediums'], queryFn: listMediums });
  const facultyQuery = useQuery({ queryKey: ['principal-academics', 'faculty'], queryFn: () => listFaculty({ limit: 200 }) });

  const isLoading =
    yearsQuery.isLoading || gradesQuery.isLoading || sectionsQuery.isLoading || subjectsQuery.isLoading || departmentsQuery.isLoading;
  const firstError = [yearsQuery, gradesQuery, sectionsQuery, subjectsQuery, departmentsQuery, mediumsQuery].find((q) => q.isError);

  if (isLoading) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Academics" onBack={() => router.back()} />
        <ActivityIndicator color={parentColors.blue} style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (firstError) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Academics" onBack={() => router.back()} />
        <ErrorState
          message={firstError.error instanceof ApiError ? firstError.error.message : 'Unable to load academic information.'}
          onRetry={() => {
            yearsQuery.refetch();
            gradesQuery.refetch();
            sectionsQuery.refetch();
            subjectsQuery.refetch();
            departmentsQuery.refetch();
            mediumsQuery.refetch();
          }}
        />
      </View>
    );
  }

  const currentYear = (yearsQuery.data ?? []).find((y) => y.isCurrent);
  const grades = gradesQuery.data ?? [];
  const sections = sectionsQuery.data ?? [];
  const subjects = subjectsQuery.data ?? [];
  const departments = departmentsQuery.data ?? [];
  const mediums = mediumsQuery.data ?? [];
  const facultyById = new Map((facultyQuery.data?.data ?? []).map((f) => [f.id, `${f.firstName} ${f.lastName ?? ''}`.trim()]));
  const departmentById = new Map(departments.map((d) => [d.id, d.name]));

  return (
    <View style={styles.flex}>
      <AppHeader title="Academics" subtitle="School-wide academic structure" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Academic year</Text>
        {currentYear ? (
          <View style={[styles.card, cardShadow]}>
            <View style={styles.infoRow}>
              <Text style={styles.infoValue}>{currentYear.name}</Text>
              <StatusBadge label="Current" tone="positive" />
            </View>
            <Text style={styles.infoMeta}>
              {formatDate(currentYear.startDate)} – {formatDate(currentYear.endDate)}
            </Text>
          </View>
        ) : (
          <EmptyState message="No current academic year is set." />
        )}

        <Text style={styles.sectionTitle}>Structure</Text>
        <View style={styles.statsRow}>
          <View style={[styles.statTile, cardShadow]}>
            <Text style={styles.statValue}>{grades.length}</Text>
            <Text style={styles.statLabel}>Grades</Text>
          </View>
          <View style={[styles.statTile, cardShadow]}>
            <Text style={styles.statValue}>{sections.length}</Text>
            <Text style={styles.statLabel}>Sections</Text>
          </View>
          <View style={[styles.statTile, cardShadow]}>
            <Text style={styles.statValue}>{subjects.length}</Text>
            <Text style={styles.statLabel}>Subjects</Text>
          </View>
          <View style={[styles.statTile, cardShadow]}>
            <Text style={styles.statValue}>{departments.length}</Text>
            <Text style={styles.statLabel}>Departments</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Grades &amp; sections</Text>
        {grades.length === 0 ? (
          <EmptyState message="No grades on record." />
        ) : (
          <View style={[styles.card, cardShadow]}>
            {grades.map((grade, index) => {
              const gradeSections = sections.filter((s) => s.gradeId === grade.id).map((s) => s.name);
              return (
                <View key={grade.id} style={[styles.stackedRow, index > 0 && styles.infoRowBorder]}>
                  <Text style={styles.infoValue}>{grade.name}</Text>
                  <Text style={styles.infoMeta}>{gradeSections.length > 0 ? gradeSections.join(', ') : 'No sections'}</Text>
                </View>
              );
            })}
          </View>
        )}

        <Text style={styles.sectionTitle}>Departments</Text>
        {departments.length === 0 ? (
          <EmptyState message="No departments on record." />
        ) : (
          <View style={[styles.card, cardShadow]}>
            {departments.map((dept, index) => (
              <View key={dept.id} style={[styles.stackedRow, index > 0 && styles.infoRowBorder]}>
                <Text style={styles.infoValue}>
                  {dept.name}
                  {dept.code ? ` (${dept.code})` : ''}
                </Text>
                <Text style={styles.infoMeta}>
                  {dept.hodStaffId && facultyById.get(dept.hodStaffId)
                    ? `HOD: ${facultyById.get(dept.hodStaffId)}`
                    : 'No HOD assigned'}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Subjects</Text>
        {subjects.length === 0 ? (
          <EmptyState message="No subjects on record." />
        ) : (
          <View style={[styles.card, cardShadow]}>
            {subjects.map((subject, index) => (
              <View key={subject.id} style={[styles.stackedRow, index > 0 && styles.infoRowBorder]}>
                <Text style={styles.infoValue}>
                  {subject.name} ({subject.code})
                </Text>
                <Text style={styles.infoMeta}>
                  {subject.subjectType}
                  {subject.departmentId && departmentById.get(subject.departmentId)
                    ? ` · ${departmentById.get(subject.departmentId)}`
                    : ''}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Mediums</Text>
        {mediums.length === 0 ? (
          <EmptyState message="No mediums on record." />
        ) : (
          <View style={[styles.card, cardShadow]}>
            {mediums.map((medium, index) => (
              <View key={medium.id} style={[styles.infoRow, index > 0 && styles.infoRowBorder]}>
                <Text style={styles.infoValue}>{medium.name}</Text>
                <Text style={styles.infoMeta}>{medium.code}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 32 },
  sectionTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink, marginTop: 18, marginBottom: 10 },
  card: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16 },
  infoRow: { paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  stackedRow: { paddingVertical: 12 },
  infoRowBorder: { borderTopWidth: 1, borderTopColor: parentColors.borderSoft },
  infoValue: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  infoMeta: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 4 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statTile: { flexBasis: '47%', flexGrow: 1, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  statLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted },
});
