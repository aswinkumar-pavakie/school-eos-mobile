// Hostel Warden -> Reports. Full feature parity with the website's own
// "Build a report" page: same 4 real sections (Occupancy/Complaints/Gate
// movement/Fees -- every one backed by real, already-used data, never the
// design's own fabricated "Students with pending fees"/"Feedback" options),
// same date-range picker. There is no server-side report-history table in
// the real backend, so this is always a fresh export of current data, never
// a fabricated saved-reports list. Export now generates a real, styled PDF
// (buildHostelReportHtml + downloadPdf, the exact same expo-print pipeline
// already proven by receipt-html.ts/permission-letter-html.ts) instead of a
// plain CSV string handed to the OS share sheet -- same real section data,
// just a professional printable document instead of raw text.

import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { hostelWardenColors } from '@/lib/theme';
import { Card, WardenSubHeader } from '@/components/hostel-warden/primitives';
import { ApiError } from '@/lib/api';
import { ErrorState } from '@/components/ScreenStates';
import { formatMoneySummary } from '@/lib/format';
import { useMe } from '@/hooks/useMe';
import { downloadPdf } from '@/lib/pdf-download';
import { buildHostelReportHtml, type HostelReportSection } from '@/lib/hostel-report-html';
import { getSchoolInfo } from '@/lib/vice-principal-profile-api';
import {
  getStudentFees,
  listComplaints,
  listEmergencyExitRequests,
  listGatePassRequests,
  listHostelStructure,
  listRoomAllocations,
} from '@/lib/hostel-warden-api';

interface ReportSection {
  key: string;
  label: string;
  note: string;
  rows: (string | number)[][];
}

function toLocalInputDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function ReportsScreen() {
  const router = useRouter();
  const [checked, setChecked] = useState<Record<string, boolean>>({ occupancy: true, complaints: false, gate: false, fees: true });
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return toLocalInputDate(d);
  });
  const [to, setTo] = useState(() => toLocalInputDate(new Date()));
  const [notice, setNotice] = useState<string | undefined>();

  const [generating, setGenerating] = useState(false);

  const allocationsQuery = useQuery({ queryKey: ['hostel-warden', 'room-allocations'], queryFn: listRoomAllocations });
  const blocksQuery = useQuery({ queryKey: ['hostel-warden', 'blocks'], queryFn: listHostelStructure });
  const complaintsQuery = useQuery({ queryKey: ['hostel-warden', 'complaints'], queryFn: listComplaints });
  const gatePassQuery = useQuery({ queryKey: ['hostel-warden', 'gate-pass-requests'], queryFn: listGatePassRequests });
  const emergencyQuery = useQuery({ queryKey: ['hostel-warden', 'emergency-exit-requests'], queryFn: listEmergencyExitRequests });
  const schoolQuery = useQuery({ queryKey: ['school-info'], queryFn: getSchoolInfo, staleTime: 5 * 60_000 });
  const me = useMe();

  const isLoading = allocationsQuery.isLoading || blocksQuery.isLoading || complaintsQuery.isLoading || gatePassQuery.isLoading || emergencyQuery.isLoading;
  const hasError = allocationsQuery.isError || blocksQuery.isError || complaintsQuery.isError || gatePassQuery.isError || emergencyQuery.isError;

  const sections = useMemo<ReportSection[]>(() => {
    const allocations = allocationsQuery.data ?? [];
    const blocks = blocksQuery.data ?? [];
    const complaints = complaintsQuery.data ?? [];
    const gatePasses = gatePassQuery.data ?? [];
    const emergencyExits = emergencyQuery.data ?? [];

    const activeAllocations = allocations.filter((a) => a.status === 'ACTIVE');
    const totalCapacity = blocks.flatMap((b) => b.rooms).reduce((sum, r) => sum + (r.bedCapacity || 0), 0);
    const occupancyRows: (string | number)[][] = [
      ['Block', 'Rooms', 'Beds occupied', 'Beds vacant'],
      ...blocks.map((b) => {
        const capacity = b.rooms.reduce((sum, r) => sum + (r.bedCapacity || 0), 0);
        const occupied = activeAllocations.filter((a) => a.blockId === b.id).length;
        return [b.name, b.rooms.length, occupied, Math.max(0, capacity - occupied)];
      }),
    ];

    const complaintCounts = complaints.reduce<Record<string, number>>((acc, c) => {
      acc[c.state] = (acc[c.state] ?? 0) + 1;
      return acc;
    }, {});
    const complaintRows: (string | number)[][] = [['Status', 'Count'], ...Object.entries(complaintCounts)];

    const tagged = [...gatePasses, ...emergencyExits];
    const gateCounts = tagged.reduce<Record<string, number>>((acc, r) => {
      acc[r.state] = (acc[r.state] ?? 0) + 1;
      return acc;
    }, {});
    const gateRows: (string | number)[][] = [['Status', 'Count'], ...Object.entries(gateCounts)];

    return [
      { key: 'occupancy', label: 'Occupancy', note: `${activeAllocations.length} of ${totalCapacity} beds taken`, rows: occupancyRows },
      { key: 'complaints', label: 'Complaints', note: `${complaints.length} logged`, rows: complaintRows },
      { key: 'gate', label: 'Gate movement', note: `${tagged.length} passes on record`, rows: gateRows },
      { key: 'fees', label: 'Fees', note: 'Collected / outstanding (fetched on export)', rows: [] },
    ];
  }, [allocationsQuery.data, blocksQuery.data, complaintsQuery.data, gatePassQuery.data, emergencyQuery.data]);

  const pickedCount = Object.values(checked).filter(Boolean).length;

  async function download() {
    if (pickedCount === 0) return setNotice('Pick at least one section to include in the report.');
    if (!from || !to || from > to) return setNotice('Choose a valid start and end date.');
    setNotice(undefined);
    setGenerating(true);

    try {
      let feesRows: (string | number)[][] = [];
      if (checked.fees) {
        const activeAllocations = (allocationsQuery.data ?? []).filter((a) => a.status === 'ACTIVE');
        const fees = await Promise.all(activeAllocations.map((a) => getStudentFees(a.studentId).catch(() => null)));
        const totalPaid = fees.reduce((sum, f) => sum + (f ? Number(f.totalPaidPaise) : 0), 0);
        const totalDue = fees.reduce((sum, f) => sum + (f ? Number(f.totalDuePaise) : 0), 0);
        feesRows = [['Metric', 'Amount'], ['Collected', formatMoneySummary(totalPaid)], ['Outstanding', formatMoneySummary(totalDue)]];
      }

      const pdfSections: HostelReportSection[] = sections
        .filter((s) => checked[s.key])
        .map((s) => ({ key: s.key, label: s.label, rows: s.key === 'fees' ? feesRows : s.rows }));

      const wardenName = [me.data?.person.firstName, me.data?.person.lastName].filter(Boolean).join(' ') || 'Hostel Warden';
      const html = buildHostelReportHtml({ school: schoolQuery.data ?? null, wardenName, from, to, sections: pdfSections });
      await downloadPdf(html, { dialogTitle: `Hostel report ${from} to ${to}` });
    } catch {
      setNotice('Could not generate the report PDF.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <View style={styles.flex}>
      <WardenSubHeader title="Reports" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? (
          <ActivityIndicator color={hostelWardenColors.primary} style={{ marginTop: 24 }} />
        ) : hasError ? (
          <ErrorState message={allocationsQuery.error instanceof ApiError ? allocationsQuery.error.message : 'Unable to load report data.'} onRetry={() => allocationsQuery.refetch()} />
        ) : (
          <Card style={{ gap: 12 }}>
            <Text style={styles.title}>Build a report</Text>
            <Text style={styles.hint}>Pick what to include. Every section reflects the current, real data for this hostel.</Text>
            {sections.map((s) => (
              <Pressable
                key={s.key}
                onPress={() => setChecked((prev) => ({ ...prev, [s.key]: !prev[s.key] }))}
                style={[styles.sectionTile, checked[s.key] && styles.sectionTileActive]}
              >
                <View style={[styles.checkbox, checked[s.key] && styles.checkboxActive]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionLabel}>{s.label}</Text>
                  <Text style={styles.sectionNote}>{s.note}</Text>
                </View>
              </Pressable>
            ))}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Start date</Text>
                <TextInput value={from} onChangeText={setFrom} placeholder="2026-08-18" placeholderTextColor={hostelWardenColors.muted} style={styles.input} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>End date</Text>
                <TextInput value={to} onChangeText={setTo} placeholder="2026-09-18" placeholderTextColor={hostelWardenColors.muted} style={styles.input} />
              </View>
            </View>
            {notice ? <Text style={styles.error}>{notice}</Text> : null}
            <Pressable style={[styles.downloadButton, generating && { opacity: 0.6 }]} onPress={download} disabled={generating}>
              {generating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.downloadButtonText}>Generate PDF report ({pickedCount} section{pickedCount === 1 ? '' : 's'})</Text>
              )}
            </Pressable>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: hostelWardenColors.background },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  title: { fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold', color: hostelWardenColors.ink },
  hint: { fontSize: 12.5, color: hostelWardenColors.muted },
  sectionTile: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: hostelWardenColors.inputBorder, borderRadius: 12, padding: 14 },
  sectionTileActive: { borderColor: hostelWardenColors.primary, backgroundColor: hostelWardenColors.tint },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: hostelWardenColors.inputBorder },
  checkboxActive: { backgroundColor: hostelWardenColors.primary, borderColor: hostelWardenColors.primary },
  sectionLabel: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: hostelWardenColors.ink },
  sectionNote: { fontSize: 11.5, color: hostelWardenColors.muted, marginTop: 2 },
  label: { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: 1, color: hostelWardenColors.muted },
  input: { borderWidth: 1, borderColor: hostelWardenColors.inputBorder, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13.5, color: hostelWardenColors.ink },
  error: { fontSize: 12.5, color: hostelWardenColors.red },
  downloadButton: { backgroundColor: hostelWardenColors.primary, borderRadius: 11, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  downloadButtonText: { color: '#fff', fontSize: 13.5, fontFamily: 'PlusJakartaSans_800ExtraBold' },
});
