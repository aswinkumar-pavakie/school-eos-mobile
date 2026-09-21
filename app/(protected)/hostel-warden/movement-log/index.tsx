// Hostel Warden -> Movement log. Full feature parity with the website's own
// movement-log page: merges parent-submitted Gate Pass/Emergency Exit
// requests with Warden-authored direct entries (the "Record an exit" form --
// the Warden takes the parent's call and logs the exit themself, then
// Record return afterward). See hostel-warden-api.ts's own movement-log
// section and the backend's outing-request.repository.ts
// createDirect/findDirectEntriesForHostels for the real schema this is
// built on. Previously this capability did not exist on mobile at all
// (website-only) -- built here so a Warden who only has the app can do
// everything the website can.

import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { hostelWardenColors } from '@/lib/theme';
import { Card, EmptyPanel, StatusPill, WardenSubHeader } from '@/components/hostel-warden/primitives';
import { ApiError } from '@/lib/api';
import { ErrorState } from '@/components/ScreenStates';
import { formatDateTime } from '@/lib/format';
import { fullName } from '@/lib/hostel-warden-status';
import {
  createMovementLogEntry,
  listEmergencyExitRequests,
  listGatePassRequests,
  listHostelStructure,
  listMovementLogEntries,
  listRoomAllocations,
  MOVEMENT_LOG_PURPOSE_LABELS,
  MOVEMENT_LOG_PURPOSES,
  recordMovementLogReturn,
  type HostelStructureBlock,
  type MovementLogPurpose,
  type OutingRequestRow,
} from '@/lib/hostel-warden-api';

type Kind = 'gate-pass' | 'emergency-exit' | 'movement-log';
const KIND_LABEL: Record<Kind, string> = {
  'gate-pass': 'Gate pass',
  'emergency-exit': 'Emergency exit',
  'movement-log': 'Warden-recorded exit',
};

function toLocalInputDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function toLocalInputTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function MovementLogScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [purposeFilter, setPurposeFilter] = useState<MovementLogPurpose | 'All'>('All');
  const [blockId, setBlockId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [studentQuery, setStudentQuery] = useState('');
  const [purpose, setPurpose] = useState<MovementLogPurpose>('HOME_LEAVE');
  const [calledByName, setCalledByName] = useState('');
  const [calledByPhone, setCalledByPhone] = useState('');
  const [leavingDate, setLeavingDate] = useState(() => toLocalInputDate(new Date()));
  const [leavingTime, setLeavingTime] = useState(() => toLocalInputTime(new Date()));
  const [returnDate, setReturnDate] = useState('');
  const [returnTime, setReturnTime] = useState('');

  const gatePassQuery = useQuery({ queryKey: ['hostel-warden', 'gate-pass-requests'], queryFn: listGatePassRequests });
  const emergencyQuery = useQuery({ queryKey: ['hostel-warden', 'emergency-exit-requests'], queryFn: listEmergencyExitRequests });
  const directQuery = useQuery({ queryKey: ['hostel-warden', 'movement-log'], queryFn: listMovementLogEntries });
  const allocationsQuery = useQuery({ queryKey: ['hostel-warden', 'room-allocations'], queryFn: listRoomAllocations });
  const blocksQuery = useQuery({ queryKey: ['hostel-warden', 'blocks'], queryFn: listHostelStructure });

  const isLoading = gatePassQuery.isLoading || emergencyQuery.isLoading || directQuery.isLoading;
  const hasError = gatePassQuery.isError || emergencyQuery.isError || directQuery.isError;
  const isFetching = gatePassQuery.isFetching || emergencyQuery.isFetching || directQuery.isFetching;

  function refetchAll() {
    gatePassQuery.refetch();
    emergencyQuery.refetch();
    directQuery.refetch();
    allocationsQuery.refetch();
    blocksQuery.refetch();
  }

  const createMutation = useMutation({
    mutationFn: () => {
      if (!studentId) throw new Error('Select a student.');
      if (!calledByName.trim() || !calledByPhone.trim()) throw new Error('Enter who called and their phone number.');
      if (!leavingDate || !leavingTime || !returnDate || !returnTime) throw new Error('Enter both a leaving time and an expected return time.');
      const outFrom = new Date(`${leavingDate}T${leavingTime}`);
      const expectedReturn = new Date(`${returnDate}T${returnTime}`);
      if (expectedReturn <= outFrom) throw new Error('Expected return must be after the leaving time.');
      return createMovementLogEntry({
        studentId,
        purposeCategory: purpose,
        reason: MOVEMENT_LOG_PURPOSE_LABELS[purpose],
        calledByName: calledByName.trim(),
        calledByPhone: calledByPhone.trim(),
        outFrom: outFrom.toISOString(),
        expectedReturn: expectedReturn.toISOString(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hostel-warden', 'movement-log'] });
      setShowForm(false);
      setStudentId('');
      setStudentQuery('');
      setPurpose('HOME_LEAVE');
      setCalledByName('');
      setCalledByPhone('');
      setReturnDate('');
      setReturnTime('');
    },
  });

  const returnMutation = useMutation({
    mutationFn: (id: string) => recordMovementLogReturn(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hostel-warden', 'movement-log'] }),
  });

  const roomByStudent = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of allocationsQuery.data ?? []) map.set(a.studentId, `${a.roomNo} · ${a.blockName}`);
    return map;
  }, [allocationsQuery.data]);

  const studentOptions = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    return (allocationsQuery.data ?? [])
      .filter((a) => a.status === 'ACTIVE')
      .filter((a) => !q || fullName(a.studentFirstName, a.studentLastName).toLowerCase().includes(q))
      .slice(0, 8);
  }, [allocationsQuery.data, studentQuery]);

  const rows = useMemo(() => {
    const tagged: (OutingRequestRow & { kind: Kind })[] = [
      ...(gatePassQuery.data ?? []).map((r) => ({ ...r, kind: 'gate-pass' as const })),
      ...(emergencyQuery.data ?? []).map((r) => ({ ...r, kind: 'emergency-exit' as const })),
      ...(directQuery.data ?? []).map((r) => ({ ...r, kind: 'movement-log' as const })),
    ];
    const block = blockId ? (blocksQuery.data ?? []).find((b) => b.id === blockId) : undefined;
    return tagged
      .filter((r) => purposeFilter === 'All' || r.purposeCategory === purposeFilter)
      .filter((r) => {
        if (!block) return true;
        return (roomByStudent.get(r.studentId) ?? '').endsWith(block.name);
      })
      .filter((r) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return `${fullName(r.studentFirstName, r.studentLastName)} ${r.reason}`.toLowerCase().includes(q);
      })
      .sort((a, b) => (a.outFrom < b.outFrom ? 1 : -1));
  }, [gatePassQuery.data, emergencyQuery.data, directQuery.data, purposeFilter, blockId, blocksQuery.data, roomByStudent, search]);

  function statusFor(r: OutingRequestRow & { kind: Kind }): { label: string } {
    if (r.kind === 'movement-log') return { label: r.actualReturnAt ? 'Returned' : 'Away' };
    if (r.state === 'REQUESTED') return { label: 'Requested' };
    if (r.state === 'APPROVED') return { label: 'Approved' };
    if (r.state === 'REJECTED') return { label: 'Rejected' };
    if (r.state === 'CANCELLED') return { label: 'Withdrawn' };
    return { label: r.state };
  }

  const selectedStudent = (allocationsQuery.data ?? []).find((a) => a.studentId === studentId);

  return (
    <View style={styles.flex}>
      <WardenSubHeader title="Movement log" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetchAll} />}
      >
        <Pressable style={styles.addButton} onPress={() => setShowForm((v) => !v)}>
          <Text style={styles.addButtonText}>{showForm ? 'Close' : '+ Record exit'}</Text>
        </Pressable>

        {showForm ? (
          <Card style={{ gap: 10 }}>
            <Text style={styles.hint}>Fill this in while the parent is on the line.</Text>
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
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {MOVEMENT_LOG_PURPOSES.map((p) => (
                <Pressable key={p} onPress={() => setPurpose(p)} style={[styles.chip, purpose === p && styles.chipActive]}>
                  <Text style={[styles.chipText, purpose === p && styles.chipTextActive]}>{MOVEMENT_LOG_PURPOSE_LABELS[p]}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>Parent who called</Text>
            <TextInput value={calledByName} onChangeText={setCalledByName} placeholder="Father · S. Menon" placeholderTextColor={hostelWardenColors.muted} style={styles.input} />
            <Text style={styles.label}>Parent phone</Text>
            <TextInput value={calledByPhone} onChangeText={setCalledByPhone} placeholder="98450 22104" placeholderTextColor={hostelWardenColors.muted} keyboardType="phone-pad" style={styles.input} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Leaving date</Text>
                <TextInput value={leavingDate} onChangeText={setLeavingDate} placeholder="2026-09-18" placeholderTextColor={hostelWardenColors.muted} style={styles.input} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Leaving time</Text>
                <TextInput value={leavingTime} onChangeText={setLeavingTime} placeholder="14:30" placeholderTextColor={hostelWardenColors.muted} style={styles.input} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Return date</Text>
                <TextInput value={returnDate} onChangeText={setReturnDate} placeholder="2026-09-18" placeholderTextColor={hostelWardenColors.muted} style={styles.input} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Return time</Text>
                <TextInput value={returnTime} onChangeText={setReturnTime} placeholder="19:00" placeholderTextColor={hostelWardenColors.muted} style={styles.input} />
              </View>
            </View>
            {createMutation.isError ? <Text style={styles.error}>{(createMutation.error as Error).message}</Text> : null}
            <Pressable style={styles.saveButton} onPress={() => createMutation.mutate()}>
              <Text style={styles.addButtonText}>{createMutation.isPending ? 'Saving…' : 'Save to log'}</Text>
            </Pressable>
          </Card>
        ) : null}

        <View style={styles.searchBox}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by student name or reason"
            placeholderTextColor={hostelWardenColors.muted}
            style={styles.searchInput}
          />
        </View>
        <View style={styles.pillRow}>
          <Pressable onPress={() => setPurposeFilter('All')} style={[styles.pillChip, purposeFilter === 'All' && styles.pillChipActive]}>
            <Text style={[styles.pillChipText, purposeFilter === 'All' && styles.pillChipTextActive]}>All</Text>
          </Pressable>
          {MOVEMENT_LOG_PURPOSES.filter((p) => p !== 'OTHER').map((p) => (
            <Pressable key={p} onPress={() => setPurposeFilter(p)} style={[styles.pillChip, purposeFilter === p && styles.pillChipActive]}>
              <Text style={[styles.pillChipText, purposeFilter === p && styles.pillChipTextActive]}>{MOVEMENT_LOG_PURPOSE_LABELS[p]}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.pillRow}>
          <Pressable onPress={() => setBlockId('')} style={[styles.pillChip, blockId === '' && styles.pillChipActive]}>
            <Text style={[styles.pillChipText, blockId === '' && styles.pillChipTextActive]}>All blocks</Text>
          </Pressable>
          {(blocksQuery.data ?? []).map((b: HostelStructureBlock) => (
            <Pressable key={b.id} onPress={() => setBlockId(b.id)} style={[styles.pillChip, blockId === b.id && styles.pillChipActive]}>
              <Text style={[styles.pillChipText, blockId === b.id && styles.pillChipTextActive]}>{b.name}</Text>
            </Pressable>
          ))}
        </View>

        {isLoading ? (
          <ActivityIndicator color={hostelWardenColors.primary} style={{ marginTop: 24 }} />
        ) : hasError ? (
          <ErrorState message={gatePassQuery.error instanceof ApiError ? gatePassQuery.error.message : 'Unable to load the movement log.'} onRetry={refetchAll} />
        ) : rows.length === 0 ? (
          <EmptyPanel label="No movement matches this filter." />
        ) : (
          rows.map((r) => {
            const st = statusFor(r);
            const isPendingDecision = r.kind !== 'movement-log' && r.state === 'REQUESTED';
            const isOpenDirectEntry = r.kind === 'movement-log' && !r.actualReturnAt;
            return (
              <Card
                key={r.id}
                style={styles.row}
                onPress={
                  isPendingDecision
                    ? () =>
                        router.push(
                          (r.kind === 'gate-pass'
                            ? `/(protected)/hostel-warden/gate-pass-requests/${r.id}`
                            : `/(protected)/hostel-warden/emergency-exit-requests/${r.id}`) as never,
                        )
                    : undefined
                }
              >
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.rowName}>{fullName(r.studentFirstName, r.studentLastName)}</Text>
                  <Text style={styles.rowMeta}>
                    {KIND_LABEL[r.kind]} · {roomByStudent.get(r.studentId) ?? '—'}
                  </Text>
                  <Text style={styles.rowMeta}>{r.reason}{r.isOvernight ? ' · Overnight' : ''}</Text>
                  <Text style={styles.rowMeta}>Out {formatDateTime(r.outFrom)} · Back by {formatDateTime(r.expectedReturn)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 8 }}>
                  <StatusPill label={st.label} />
                  {isOpenDirectEntry ? (
                    <Pressable
                      disabled={returnMutation.isPending}
                      onPress={() => returnMutation.mutate(r.id)}
                      style={styles.returnButton}
                    >
                      <Text style={styles.returnButtonText}>{returnMutation.isPending ? 'Saving…' : 'Record return'}</Text>
                    </Pressable>
                  ) : null}
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: hostelWardenColors.background },
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
  chip: { borderWidth: 1, borderColor: hostelWardenColors.inputBorder, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 8 },
  chipActive: { backgroundColor: hostelWardenColors.primary, borderColor: hostelWardenColors.primary },
  chipText: { fontSize: 12.5, color: hostelWardenColors.bodyStrong, fontFamily: 'PlusJakartaSans_600SemiBold' },
  chipTextActive: { color: '#fff' },
  error: { fontSize: 12.5, color: hostelWardenColors.red },
  searchBox: { marginTop: 4 },
  searchInput: { borderWidth: 1, borderColor: hostelWardenColors.inputBorder, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13.5, color: hostelWardenColors.ink, backgroundColor: hostelWardenColors.surface },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pillChip: { borderWidth: 1, borderColor: hostelWardenColors.inputBorder, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 7 },
  pillChipActive: { backgroundColor: hostelWardenColors.primary, borderColor: hostelWardenColors.primary },
  pillChipText: { fontSize: 12, color: hostelWardenColors.bodyStrong, fontFamily: 'PlusJakartaSans_600SemiBold' },
  pillChipTextActive: { color: '#fff' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rowName: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: hostelWardenColors.ink },
  rowMeta: { fontSize: 12, color: hostelWardenColors.muted, marginTop: 2 },
  returnButton: { borderWidth: 1, borderColor: hostelWardenColors.inputBorder, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  returnButtonText: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_700Bold', color: hostelWardenColors.bodyStrong },
});
