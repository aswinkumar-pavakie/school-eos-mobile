// Hostel Warden -> Leave register. Home leave in this schema IS an
// outing_request (isOvernight=true) -- there is no separate "leave" table
// (see backend's own outing-request repository comment). Recording one
// reuses the exact same real Movement Log write the Movement log screen's
// own "Record an exit" uses, just pre-set to purpose=HOME_LEAVE and
// isOvernight=true, matching the website's own RecordLeaveForm exactly --
// full feature parity: this was previously read-only-only on mobile.

import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { hostelWardenColors } from '@/lib/theme';
import { Card, EmptyPanel, StatusPill, WardenSubHeader } from '@/components/hostel-warden/primitives';
import { createMovementLogEntry, listGatePassRequests, listEmergencyExitRequests, listRoomAllocations } from '@/lib/hostel-warden-api';
import { fullName } from '@/lib/hostel-warden-status';
import { formatDateTime } from '@/lib/format';
import { ApiError } from '@/lib/api';
import { ErrorState } from '@/components/ScreenStates';

function toLocalInputDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function LeaveRegisterScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [studentQuery, setStudentQuery] = useState('');
  const [purpose, setPurpose] = useState('');
  const [calledByName, setCalledByName] = useState('');
  const [calledByPhone, setCalledByPhone] = useState('');
  const [fromDate, setFromDate] = useState(() => toLocalInputDate(new Date()));
  const [toDate, setToDate] = useState('');

  const gatePassQuery = useQuery({ queryKey: ['hostel-warden', 'gate-pass-requests'], queryFn: listGatePassRequests });
  const emergencyQuery = useQuery({ queryKey: ['hostel-warden', 'emergency-exit-requests'], queryFn: listEmergencyExitRequests });
  const allocationsQuery = useQuery({ queryKey: ['hostel-warden', 'room-allocations'], queryFn: listRoomAllocations });

  const isLoading = gatePassQuery.isLoading || emergencyQuery.isLoading || allocationsQuery.isLoading;
  const hasError = gatePassQuery.isError || emergencyQuery.isError || allocationsQuery.isError;
  const isFetching = gatePassQuery.isFetching || emergencyQuery.isFetching;

  const createMutation = useMutation({
    mutationFn: () => {
      if (!studentId) throw new Error('Select a student.');
      if (!purpose.trim()) throw new Error('Enter the purpose of the leave.');
      if (!calledByName.trim() || !calledByPhone.trim()) throw new Error('Enter who called and their phone number.');
      if (!toDate) throw new Error('Enter a return date.');
      if (toDate <= fromDate) throw new Error('Return date must be after the start date.');
      return createMovementLogEntry({
        studentId,
        purposeCategory: 'HOME_LEAVE',
        isOvernight: true,
        reason: purpose.trim(),
        calledByName: calledByName.trim(),
        calledByPhone: calledByPhone.trim(),
        outFrom: new Date(`${fromDate}T09:00:00`).toISOString(),
        expectedReturn: new Date(`${toDate}T18:00:00`).toISOString(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hostel-warden', 'gate-pass-requests'] });
      qc.invalidateQueries({ queryKey: ['hostel-warden', 'emergency-exit-requests'] });
      qc.invalidateQueries({ queryKey: ['hostel-warden', 'movement-log'] });
      setShowForm(false);
      setStudentId('');
      setStudentQuery('');
      setPurpose('');
      setCalledByName('');
      setCalledByPhone('');
      setToDate('');
    },
  });

  const studentOptions = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    return (allocationsQuery.data ?? [])
      .filter((a) => a.status === 'ACTIVE')
      .filter((a) => !q || fullName(a.studentFirstName, a.studentLastName).toLowerCase().includes(q))
      .slice(0, 8);
  }, [allocationsQuery.data, studentQuery]);

  const selectedStudent = (allocationsQuery.data ?? []).find((a) => a.studentId === studentId);

  const rows = useMemo(() => {
    const roomByStudent = new Map<string, string>();
    for (const a of allocationsQuery.data ?? []) roomByStudent.set(a.studentId, `${a.roomNo} · ${a.blockName}`);

    const now = Date.now();
    const q = search.trim().toLowerCase();
    return [...(gatePassQuery.data ?? []), ...(emergencyQuery.data ?? [])]
      .filter((r) => r.isOvernight && r.state === 'APPROVED')
      .map((r) => {
        const days = Math.max(1, Math.round((new Date(r.expectedReturn).getTime() - new Date(r.outFrom).getTime()) / 86400000));
        return {
          id: r.id,
          studentName: fullName(r.studentFirstName, r.studentLastName),
          room: roomByStudent.get(r.studentId) ?? '—',
          reason: r.reason,
          destination: r.destination,
          outFrom: r.outFrom,
          expectedReturn: r.expectedReturn,
          days,
          pastDue: new Date(r.expectedReturn).getTime() < now,
        };
      })
      .filter((r) => !q || `${r.studentName} ${r.room} ${r.reason}`.toLowerCase().includes(q))
      .sort((a, b) => new Date(b.outFrom).getTime() - new Date(a.outFrom).getTime());
  }, [gatePassQuery.data, emergencyQuery.data, allocationsQuery.data, search]);

  function refetchAll() {
    gatePassQuery.refetch();
    emergencyQuery.refetch();
    allocationsQuery.refetch();
  }

  return (
    <View style={styles.flex}>
      <WardenSubHeader title="Leave register" onBack={() => router.back()} />
      <View style={styles.searchBox}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by student, room or purpose"
          placeholderTextColor={hostelWardenColors.muted}
          style={styles.searchInput}
        />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetchAll} />}
      >
        <Pressable style={styles.addButton} onPress={() => setShowForm((v) => !v)}>
          <Text style={styles.addButtonText}>{showForm ? 'Close' : '+ Record leave'}</Text>
        </Pressable>
        {showForm ? (
          <Card style={{ gap: 10 }}>
            <Text style={styles.hint}>Every field here is entered by the warden on the parent&apos;s call.</Text>
            <Text style={styles.label}>Student</Text>
            <TextInput
              value={studentId && selectedStudent ? fullName(selectedStudent.studentFirstName, selectedStudent.studentLastName) : studentQuery}
              onChangeText={(t) => { setStudentId(''); setStudentQuery(t); }}
              placeholder="Search by student name"
              placeholderTextColor={hostelWardenColors.muted}
              style={styles.input}
            />
            {!studentId && studentQuery.trim().length >= 1 && studentOptions.length > 0 ? (
              <View>
                {studentOptions.map((s) => (
                  <Pressable key={s.studentId} style={styles.resultRow} onPress={() => { setStudentId(s.studentId); setStudentQuery(''); }}>
                    <Text style={styles.resultName}>{fullName(s.studentFirstName, s.studentLastName)}</Text>
                    <Text style={styles.resultMeta}>{s.roomNo} · {s.blockName}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <Text style={styles.label}>Purpose</Text>
            <TextInput value={purpose} onChangeText={setPurpose} placeholder="Sibling wedding at Kozhikode" placeholderTextColor={hostelWardenColors.muted} style={styles.input} />
            <Text style={styles.label}>Parent who called</Text>
            <TextInput value={calledByName} onChangeText={setCalledByName} placeholder="Father · 99400 71230" placeholderTextColor={hostelWardenColors.muted} style={styles.input} />
            <Text style={styles.label}>Parent phone</Text>
            <TextInput value={calledByPhone} onChangeText={setCalledByPhone} placeholder="99400 71230" placeholderTextColor={hostelWardenColors.muted} keyboardType="phone-pad" style={styles.input} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>From</Text>
                <TextInput value={fromDate} onChangeText={setFromDate} placeholder="2026-09-18" placeholderTextColor={hostelWardenColors.muted} style={styles.input} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>To</Text>
                <TextInput value={toDate} onChangeText={setToDate} placeholder="2026-09-22" placeholderTextColor={hostelWardenColors.muted} style={styles.input} />
              </View>
            </View>
            {createMutation.isError ? <Text style={styles.error}>{(createMutation.error as Error).message}</Text> : null}
            <Pressable style={styles.saveButton} onPress={() => createMutation.mutate()}>
              <Text style={styles.addButtonText}>{createMutation.isPending ? 'Saving…' : 'Save record'}</Text>
            </Pressable>
          </Card>
        ) : null}
        {isLoading ? (
          <ActivityIndicator color={hostelWardenColors.primary} style={{ marginTop: 24 }} />
        ) : hasError ? (
          <ErrorState message={gatePassQuery.error instanceof ApiError ? gatePassQuery.error.message : 'Unable to load the leave register.'} onRetry={refetchAll} />
        ) : rows.length === 0 ? (
          <EmptyPanel label="No approved overnight leave on record." />
        ) : (
          rows.map((r) => (
            <Card key={r.id}>
              <View style={styles.rowTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>{r.studentName}</Text>
                  <Text style={styles.rowMeta}>{r.room}</Text>
                </View>
                <StatusPill label={r.pastDue ? 'Past due date' : 'Away'} />
              </View>
              <Text style={styles.reason}>{r.reason}{r.destination ? ` · ${r.destination}` : ''}</Text>
              <Text style={styles.dates}>{formatDateTime(r.outFrom)} → {formatDateTime(r.expectedReturn)} · {r.days} day{r.days === 1 ? '' : 's'}</Text>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: hostelWardenColors.background },
  searchBox: { paddingHorizontal: 16, paddingTop: 12 },
  searchInput: { borderWidth: 1, borderColor: hostelWardenColors.inputBorder, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13.5, color: hostelWardenColors.ink, backgroundColor: hostelWardenColors.surface },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  addButton: { backgroundColor: hostelWardenColors.primary, borderRadius: 13, paddingVertical: 14, alignItems: 'center' },
  addButtonText: { color: '#fff', fontSize: 14.5, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  saveButton: { backgroundColor: hostelWardenColors.primary, borderRadius: 11, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  hint: { fontSize: 12, color: hostelWardenColors.muted },
  label: { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: 1, color: hostelWardenColors.muted },
  input: { borderWidth: 1, borderColor: hostelWardenColors.inputBorder, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13.5, color: hostelWardenColors.ink },
  resultRow: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: hostelWardenColors.tint },
  resultName: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: hostelWardenColors.ink },
  resultMeta: { fontSize: 12, color: hostelWardenColors.muted, marginTop: 2 },
  error: { fontSize: 12.5, color: hostelWardenColors.red },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rowName: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: hostelWardenColors.ink },
  rowMeta: { fontSize: 12, color: hostelWardenColors.muted, marginTop: 2 },
  reason: { fontSize: 13, color: hostelWardenColors.body, marginTop: 10 },
  dates: { fontSize: 11.5, color: hostelWardenColors.muted, marginTop: 6 },
});
