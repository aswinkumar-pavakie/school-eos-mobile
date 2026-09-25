// Attendance Diary -- one shared screen for every role that has it (Principal, Vice Principal,
// Academic Coordinator, Class Advisor, Faculty). What a login can see is decided by the backend
// from that person's own class mappings; this screen only renders what it is given (it shows the
// Employees toggle only when the backend says `canViewEmployees`, and the class filter only lists
// that login's own classes).

import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ScreenStates';
import {
  getDiaryContext,
  listDiaryEmployees,
  listDiaryStudents,
  type DiaryContext,
  type DiaryEmployeeRow,
  type DiaryStudentRow,
} from '@/lib/attendance-diary-api';
import { principalColors as c } from '@/lib/theme';

type Tab = 'students' | 'employees';
const PAGE_SIZE = 25;

const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  PRESENT: { label: 'Present', bg: '#E7F5EE', fg: '#18794E' },
  ABSENT: { label: 'Absent', bg: '#FDECEC', fg: '#C2400F' },
  LATE: { label: 'Late', bg: '#FEF3C7', fg: '#92400E' },
  ON_DUTY: { label: 'On duty', bg: '#EAF0FF', fg: '#2F5FF4' },
  ON_LEAVE: { label: 'On leave', bg: '#F3E8FF', fg: '#6B21A8' },
  NOT_MARKED: { label: 'Not marked', bg: '#EEF1F7', fg: '#6B7A99' },
};

const BANDS = [
  { value: '', label: 'Any %' },
  { value: 'LT75', label: 'Below 75%' },
  { value: 'LT60', label: 'Below 60%' },
  { value: 'BETWEEN_75_90', label: '75% – 90%' },
  { value: 'GTE90', label: '90%+' },
];

// ---------------------------------------------------------------- helpers
const parseDate = (d: string) => new Date(`${d}T00:00:00Z`);
const toIso = (dt: Date) => dt.toISOString().slice(0, 10);
const addDays = (d: string, n: number) => toIso(new Date(parseDate(d).getTime() + n * 86400000));
const fmtLong = (d: string) =>
  new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(parseDate(d));
const fmtTime = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }).format(new Date(iso)) : null;
const fullName = (f: string, l: string | null) => [f, l].filter(Boolean).join(' ');
const initials = (f: string, l: string | null) => `${f[0] ?? ''}${l?.[0] ?? ''}`.toUpperCase();
const pctColor = (p: number | null) => (p === null ? c.tertiary : p < 75 ? '#C2400F' : p < 90 ? '#D97706' : '#16A34A');

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

interface Filters {
  gradeIds: string[];
  sectionIds: string[];
  dayStatus: string;
  percentBand: string;
  residence: string;
  transport: string;
  gender: string;
  sort: string;
  group: string;
  departmentId: string;
}
const EMPTY: Filters = { gradeIds: [], sectionIds: [], dayStatus: '', percentBand: '', residence: '', transport: '', gender: '', sort: '', group: '', departmentId: '' };

// ---------------------------------------------------------------- small UI
function Pill({ status }: { status: string }) {
  const s = STATUS[status] ?? STATUS.NOT_MARKED!;
  return (
    <View style={[styles.pill, { backgroundColor: s.bg }]}>
      <Text style={[styles.pillText, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

function OptionRow({ label, options, value, onChange }: { label: string; options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ marginTop: 16 }}>
      <Text style={styles.sheetLabel}>{label}</Text>
      <View style={styles.wrap}>
        {options.map((o) => (
          <Chip key={o.value || 'any'} label={o.label} active={value === o.value} onPress={() => onChange(o.value)} />
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------- calendar
function CalendarModal({ visible, value, max, onPick, onClose }: { visible: boolean; value: string; max: string; onPick: (d: string) => void; onClose: () => void }) {
  const start = parseDate(value);
  const [view, setView] = useState({ y: start.getUTCFullYear(), m: start.getUTCMonth() });
  const first = new Date(Date.UTC(view.y, view.m, 1));
  const offset = first.getUTCDay();
  const dim = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const cells: (string | null)[] = [...Array(offset).fill(null), ...Array.from({ length: dim }, (_, i) => toIso(new Date(Date.UTC(view.y, view.m, i + 1))))];
  const shift = (n: number) => setView((v) => { const d = new Date(Date.UTC(v.y, v.m + n, 1)); return { y: d.getUTCFullYear(), m: d.getUTCMonth() }; });
  const title = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(first);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.calCard} onPress={() => undefined}>
          <View style={styles.calHead}>
            <Pressable onPress={() => shift(-1)} hitSlop={10} accessibilityLabel="Previous month"><Ionicons name="chevron-back" size={20} color={c.ink} /></Pressable>
            <Text style={styles.calTitle}>{title}</Text>
            <Pressable onPress={() => shift(1)} hitSlop={10} accessibilityLabel="Next month"><Ionicons name="chevron-forward" size={20} color={c.ink} /></Pressable>
          </View>
          <View style={styles.calGrid}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <Text key={i} style={styles.calDow}>{d}</Text>
            ))}
            {cells.map((d, i) =>
              d === null ? (
                <View key={`b${i}`} style={styles.calCell} />
              ) : (
                <Pressable key={d} disabled={d > max} onPress={() => onPick(d)} style={[styles.calCell, d === value && styles.calCellActive, d === max && d !== value && styles.calCellToday]}>
                  <Text style={[styles.calNum, d === value && { color: '#fff' }, d > max && { color: c.faint }]}>{Number(d.slice(8))}</Text>
                </Pressable>
              ),
            )}
          </View>
          <Pressable onPress={() => onPick(max)} style={styles.todayBtn}><Text style={styles.todayBtnText}>Jump to today</Text></Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ---------------------------------------------------------------- filters sheet
function FiltersSheet({ visible, tab, ctx, value, onApply, onClose }: { visible: boolean; tab: Tab; ctx: DiaryContext; value: Filters; onApply: (f: Filters) => void; onClose: () => void }) {
  const [f, setF] = useState<Filters>(value);
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setF((p) => ({ ...p, [k]: v }));
  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const grades = [...ctx.grades].sort((a, b) => a.levelNo - b.levelNo);

  const statusOptions = tab === 'students'
    ? [{ value: '', label: 'Any' }, { value: 'PRESENT', label: 'Present' }, { value: 'ABSENT', label: 'Absent' }, { value: 'LATE', label: 'Late' }, { value: 'NOT_MARKED', label: 'Not marked' }]
    : [{ value: '', label: 'Any' }, { value: 'PRESENT', label: 'Present' }, { value: 'ABSENT', label: 'Absent' }, { value: 'ON_DUTY', label: 'On duty' }, { value: 'ON_LEAVE', label: 'On leave' }, { value: 'NOT_MARKED', label: 'Not marked' }];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <View style={styles.sheet}>
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>Filters</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close"><Ionicons name="close" size={22} color={c.ink} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
            {tab === 'students' ? (
              <>
                <Text style={[styles.sheetLabel, { marginTop: 4 }]}>Standards & sections</Text>
                {grades.length === 0 && <Text style={styles.muted}>No classes are mapped to your account yet.</Text>}
                {grades.map((g) => (
                  <View key={g.id} style={styles.gradeBlock}>
                    <Chip label={`Standard ${g.name}`} active={f.gradeIds.includes(g.id)} onPress={() => set('gradeIds', toggle(f.gradeIds, g.id))} />
                    <View style={[styles.wrap, { marginTop: 8, marginLeft: 6 }]}>
                      {ctx.sections.filter((s) => s.gradeId === g.id).map((s) => (
                        <Chip key={s.id} label={`${g.name}-${s.name}`} active={f.sectionIds.includes(s.id)} onPress={() => set('sectionIds', toggle(f.sectionIds, s.id))} />
                      ))}
                    </View>
                  </View>
                ))}
                <OptionRow label="Day status" options={statusOptions} value={f.dayStatus} onChange={(v) => set('dayStatus', v)} />
                <OptionRow label="Attendance %" options={BANDS} value={f.percentBand} onChange={(v) => set('percentBand', v)} />
                <OptionRow label="Residence" options={[{ value: '', label: 'Any' }, { value: 'HOSTEL', label: 'Hostellers' }, { value: 'DAY_SCHOLAR', label: 'Day scholars' }]} value={f.residence} onChange={(v) => set('residence', v)} />
                <OptionRow label="Transport" options={[{ value: '', label: 'Any' }, { value: 'BUS', label: 'School bus' }, { value: 'NO_BUS', label: 'No bus' }]} value={f.transport} onChange={(v) => set('transport', v)} />
                <OptionRow label="Gender" options={[{ value: '', label: 'Any' }, { value: 'MALE', label: 'Boys' }, { value: 'FEMALE', label: 'Girls' }]} value={f.gender} onChange={(v) => set('gender', v)} />
                <OptionRow label="Sort by" options={[{ value: '', label: 'Class & roll' }, { value: 'NAME', label: 'Name' }, { value: 'PERCENT_ASC', label: 'Lowest %' }, { value: 'PERCENT_DESC', label: 'Highest %' }]} value={f.sort} onChange={(v) => set('sort', v)} />
              </>
            ) : (
              <>
                <OptionRow label="Employee group" options={[{ value: '', label: 'All' }, { value: 'PRINCIPAL', label: 'Principal' }, { value: 'VICE_PRINCIPAL', label: 'Vice principal' }, { value: 'FACULTY', label: 'Faculty' }]} value={f.group} onChange={(v) => set('group', v)} />
                <OptionRow label="Day status" options={statusOptions} value={f.dayStatus} onChange={(v) => set('dayStatus', v)} />
                <OptionRow label="Attendance %" options={BANDS} value={f.percentBand} onChange={(v) => set('percentBand', v)} />
                {ctx.departments.length > 0 && (
                  <OptionRow label="Department" options={[{ value: '', label: 'All' }, ...ctx.departments.map((d) => ({ value: d.id, label: d.name }))]} value={f.departmentId} onChange={(v) => set('departmentId', v)} />
                )}
                <OptionRow label="Sort by" options={[{ value: '', label: 'Name' }, { value: 'PERCENT_ASC', label: 'Lowest %' }, { value: 'PERCENT_DESC', label: 'Highest %' }]} value={f.sort} onChange={(v) => set('sort', v)} />
              </>
            )}
          </ScrollView>
          <View style={styles.sheetFoot}>
            <Pressable onPress={() => setF(EMPTY)} style={[styles.footBtn, styles.footGhost]}><Text style={[styles.footText, { color: c.primary }]}>Reset</Text></Pressable>
            <Pressable onPress={() => onApply(f)} style={[styles.footBtn, { backgroundColor: c.primary }]}><Text style={[styles.footText, { color: '#fff' }]}>Apply</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------- screen
export function AttendanceDiaryScreen({
  onBack,
  onOpenStudent,
  onOpenEmployee,
}: {
  onBack: () => void;
  /** Where tapping a student goes (that role's own student profile). Omit for none. */
  onOpenStudent?: (studentId: string, role: string) => void;
  onOpenEmployee?: (staffId: string, role: string) => void;
}) {
  const ctxQuery = useQuery({ queryKey: ['attendance-diary', 'context'], queryFn: () => getDiaryContext(), staleTime: 60_000 });
  const ctx = ctxQuery.data;

  const [tab, setTab] = useState<Tab>('students');
  const [date, setDate] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const dq = useDebounced(q, 300);
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [pageState, setPageState] = useState<{ key: string; page: number }>({ key: '', page: 1 });
  const [calOpen, setCalOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const effectiveDate = date ?? ctx?.date ?? '';
  const filterKey = JSON.stringify([tab, effectiveDate, dq, filters]);
  const page = pageState.key === filterKey ? pageState.page : 1;
  const setPage = (p: number) => setPageState({ key: filterKey, page: p });

  const enabled = !!ctx && !!effectiveDate;
  const studentsQuery = useQuery({
    queryKey: ['attendance-diary', 'students', effectiveDate, dq, filters, page],
    queryFn: () =>
      listDiaryStudents({
        date: effectiveDate, q: dq, gradeIds: filters.gradeIds, sectionIds: filters.sectionIds, dayStatus: filters.dayStatus || undefined,
        percentBand: filters.percentBand || undefined, residence: filters.residence || undefined, transport: filters.transport || undefined,
        gender: filters.gender || undefined, sort: filters.sort || undefined, page, pageSize: PAGE_SIZE,
      }),
    enabled: enabled && tab === 'students',
    placeholderData: keepPreviousData,
  });
  const employeesQuery = useQuery({
    queryKey: ['attendance-diary', 'employees', effectiveDate, dq, filters, page],
    queryFn: () =>
      listDiaryEmployees({
        date: effectiveDate, q: dq, group: filters.group || undefined, dayStatus: filters.dayStatus || undefined,
        percentBand: filters.percentBand || undefined, departmentId: filters.departmentId || undefined, sort: filters.sort || undefined, page, pageSize: PAGE_SIZE,
      }),
    enabled: enabled && tab === 'employees',
    placeholderData: keepPreviousData,
  });

  const activeQuery = tab === 'students' ? studentsQuery : employeesQuery;
  const pageData = tab === 'students' ? studentsQuery.data : employeesQuery.data;
  const total = pageData?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const role = ctx?.access.role ?? '';

  const activeCount = useMemo(() => {
    const f = filters;
    return (tab === 'students'
      ? [f.gradeIds.length + f.sectionIds.length > 0, !!f.dayStatus, !!f.percentBand, !!f.residence, !!f.transport, !!f.gender]
      : [!!f.group, !!f.dayStatus, !!f.percentBand, !!f.departmentId]
    ).filter(Boolean).length;
  }, [filters, tab]);

  const changeTab = (t: Tab) => { setTab(t); setFilters(EMPTY); setQ(''); };
  const setStatus = (v: string) => setFilters((p) => ({ ...p, dayStatus: p.dayStatus === v ? '' : v }));
  const setBand = (v: string) => setFilters((p) => ({ ...p, percentBand: p.percentBand === v ? '' : v }));

  const summary = pageData?.summary as (Record<string, number | null> | undefined);
  const tiles = tab === 'students'
    ? [['Students', summary?.total, c.ink, ''], ['Present', summary?.present, '#18794E', 'PRESENT'], ['Absent', summary?.absent, '#C2400F', 'ABSENT'], ['Late', summary?.late, '#92400E', 'LATE'], ['Not marked', summary?.notMarked, c.muted, 'NOT_MARKED'], ['Avg %', summary?.averagePercentage != null ? `${summary.averagePercentage}%` : '—', c.primary, 'AVG']]
    : [['Employees', summary?.total, c.ink, ''], ['Present', summary?.present, '#18794E', 'PRESENT'], ['Absent', summary?.absent, '#C2400F', 'ABSENT'], ['On duty', summary?.onDuty, c.primary, 'ON_DUTY'], ['On leave', summary?.onLeave, '#6B21A8', 'ON_LEAVE'], ['Avg %', summary?.averagePercentage != null ? `${summary.averagePercentage}%` : '—', c.primary, 'AVG']];

  if (ctxQuery.isError) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Attendance Diary" onBack={onBack} />
        <ErrorState message={ctxQuery.error instanceof Error ? ctxQuery.error.message : "Couldn't load the Attendance Diary."} onRetry={() => void ctxQuery.refetch()} />
      </View>
    );
  }
  if (!ctx) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Attendance Diary" onBack={onBack} />
        <ActivityIndicator color={c.primary} style={{ marginTop: 40 }} />
      </View>
    );
  }

  const header = (
    <View>
      {ctx.access.canViewEmployees && (
        <View style={styles.segment} accessibilityRole="tablist">
          {(['students', 'employees'] as Tab[]).map((t) => (
            <Pressable key={t} onPress={() => changeTab(t)} accessibilityRole="tab" accessibilityState={{ selected: tab === t }} style={[styles.segBtn, tab === t && styles.segBtnActive]}>
              <Text style={[styles.segText, tab === t && { color: c.primary }]}>{t === 'students' ? 'Students' : 'Employees'}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={c.tertiary} />
          <TextInput value={q} onChangeText={setQ} maxLength={60} placeholder={tab === 'students' ? 'Search student name or admission no.' : 'Search employee name or no.'} placeholderTextColor={c.disabled} style={styles.searchInput} autoCorrect={false} />
          {q.length > 0 && <Pressable onPress={() => setQ('')} hitSlop={8} accessibilityLabel="Clear search"><Ionicons name="close-circle" size={18} color={c.tertiary} /></Pressable>}
        </View>
        <Pressable onPress={() => setSheetOpen(true)} style={[styles.iconBtn, activeCount > 0 && { borderColor: c.primary, backgroundColor: c.tint }]} accessibilityLabel="Filters">
          <Ionicons name="options" size={20} color={activeCount > 0 ? c.primary : c.ink} />
          {activeCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{activeCount}</Text></View>}
        </Pressable>
      </View>

      <View style={styles.dateRow}>
        <Pressable onPress={() => setDate(addDays(effectiveDate, -1))} style={styles.iconBtn} accessibilityLabel="Previous day"><Ionicons name="chevron-back" size={18} color={c.ink} /></Pressable>
        <Pressable onPress={() => setCalOpen(true)} style={styles.dateBtn} accessibilityLabel="Choose date">
          <Ionicons name="calendar" size={18} color={c.primary} />
          <Text style={styles.dateText}>{fmtLong(effectiveDate)}</Text>
          {effectiveDate === ctx.today && <Text style={styles.todayTag}>TODAY</Text>}
        </Pressable>
        <Pressable disabled={effectiveDate >= ctx.today} onPress={() => setDate(addDays(effectiveDate, 1))} style={[styles.iconBtn, effectiveDate >= ctx.today && { opacity: 0.4 }]} accessibilityLabel="Next day"><Ionicons name="chevron-forward" size={18} color={c.ink} /></Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        <Chip label="All" active={activeCount === 0 && !q} onPress={() => { setFilters(EMPTY); setQ(''); }} />
        {tab === 'students' ? (
          <>
            <Chip label="Attendance < 75%" active={filters.percentBand === 'LT75'} onPress={() => setBand('LT75')} />
            <Chip label="Absent" active={filters.dayStatus === 'ABSENT'} onPress={() => setStatus('ABSENT')} />
            <Chip label="Late" active={filters.dayStatus === 'LATE'} onPress={() => setStatus('LATE')} />
            <Chip label="Not marked" active={filters.dayStatus === 'NOT_MARKED'} onPress={() => setStatus('NOT_MARKED')} />
            <Chip label="Hostellers" active={filters.residence === 'HOSTEL'} onPress={() => setFilters((p) => ({ ...p, residence: p.residence === 'HOSTEL' ? '' : 'HOSTEL' }))} />
          </>
        ) : (
          <>
            <Chip label="Absent" active={filters.dayStatus === 'ABSENT'} onPress={() => setStatus('ABSENT')} />
            <Chip label="On leave" active={filters.dayStatus === 'ON_LEAVE'} onPress={() => setStatus('ON_LEAVE')} />
            <Chip label="Not marked" active={filters.dayStatus === 'NOT_MARKED'} onPress={() => setStatus('NOT_MARKED')} />
            <Chip label="Attendance < 75%" active={filters.percentBand === 'LT75'} onPress={() => setBand('LT75')} />
          </>
        )}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tileRow}>
        {tiles.map(([label, value, color, key]) => {
          const clickable = !!key && key !== 'AVG';
          return (
            <Pressable key={String(label)} disabled={!clickable} onPress={() => setStatus(String(key))} style={[styles.tile, clickable && filters.dayStatus === key && { borderColor: c.primary }]}>
              <Text style={styles.tileLabel}>{String(label)}</Text>
              <Text style={[styles.tileValue, { color: String(color) }]}>{activeQuery.isLoading ? '…' : String(value ?? 0)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  type Row = DiaryStudentRow | DiaryEmployeeRow;
  const items = (pageData?.items ?? []) as Row[];

  return (
    <View style={styles.flex}>
      <AppHeader title="Attendance Diary" subtitle={`${ctx.access.roleLabel} · ${ctx.access.kind === 'FULL' ? 'Whole school' : `${ctx.access.classCount} class${ctx.access.classCount === 1 ? '' : 'es'}`}`} onBack={onBack} />
      <FlatList
        data={items}
        keyExtractor={(r) => ('studentId' in r ? r.studentId : r.staffId)}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={activeQuery.isFetching && !activeQuery.isLoading} onRefresh={() => void activeQuery.refetch()} />}
        ListEmptyComponent={
          activeQuery.isError ? (
            <ErrorState message={activeQuery.error instanceof Error ? activeQuery.error.message : 'Something went wrong.'} onRetry={() => void activeQuery.refetch()} />
          ) : activeQuery.isLoading ? (
            <ActivityIndicator color={c.primary} style={{ marginTop: 32 }} />
          ) : (
            <Text style={styles.empty}>{ctx.access.kind === 'SCOPED' && ctx.access.classCount === 0 ? 'No classes are mapped to your account yet.' : `No ${tab} match these filters.`}</Text>
          )
        }
        ListFooterComponent={
          total > 0 ? (
            <View style={styles.pager}>
              <Text style={styles.muted}>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable disabled={page <= 1} onPress={() => setPage(page - 1)} style={[styles.pagerBtn, page <= 1 && { opacity: 0.4 }]}><Text style={styles.pagerText}>Previous</Text></Pressable>
                <Pressable disabled={page >= lastPage} onPress={() => setPage(page + 1)} style={[styles.pagerBtn, page >= lastPage && { opacity: 0.4 }]}><Text style={styles.pagerText}>Next</Text></Pressable>
              </View>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const isStudent = 'studentId' in item;
          const name = fullName(item.firstName, item.lastName);
          const onPress = isStudent ? (onOpenStudent ? () => onOpenStudent(item.studentId, role) : undefined) : onOpenEmployee ? () => onOpenEmployee((item as DiaryEmployeeRow).staffId, role) : undefined;
          const pct = item.percentage;
          const sub = isStudent ? `${(item as DiaryStudentRow).gradeName}-${(item as DiaryStudentRow).sectionName} · Adm. ${(item as DiaryStudentRow).admissionNo}` : `${(item as DiaryEmployeeRow).group === 'PRINCIPAL' ? 'Principal' : (item as DiaryEmployeeRow).group === 'VICE_PRINCIPAL' ? 'Vice Principal' : (item as DiaryEmployeeRow).designation ?? 'Faculty'} · Emp. ${(item as DiaryEmployeeRow).employeeNo}`;
          const detail = isStudent
            ? item.dayStatus === 'ABSENT' ? (item as DiaryStudentRow).reason : item.dayStatus === 'LATE' ? (item as DiaryStudentRow).markedAt ? `Marked ${fmtTime((item as DiaryStudentRow).markedAt)}` : null : null
            : item.dayStatus === 'PRESENT' ? ((item as DiaryEmployeeRow).eventAt ? `In ${fmtTime((item as DiaryEmployeeRow).eventAt)}` : null) : (item as DiaryEmployeeRow).reason;
          return (
            <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={onPress ? `Open ${name}'s profile` : name} style={styles.row}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{initials(item.firstName, item.lastName)}</Text></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.name} numberOfLines={1}>{name}</Text>
                <Text style={styles.sub} numberOfLines={1}>{sub}</Text>
                <View style={styles.pctRow}>
                  <Text style={[styles.pct, { color: pctColor(pct) }]}>{pct === null ? '—' : `${pct}%`}</Text>
                  <View style={styles.track}><View style={[styles.fill, { width: `${pct ?? 0}%`, backgroundColor: pctColor(pct) }]} /></View>
                  <Text style={styles.sub}>{item.totalDays > 0 ? `${item.presentDays}/${item.totalDays}` : 'no records'}</Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4, maxWidth: 110 }}>
                <Pill status={item.dayStatus} />
                {!!detail && <Text style={styles.detail} numberOfLines={2}>{detail}</Text>}
              </View>
            </Pressable>
          );
        }}
      />

      <CalendarModal visible={calOpen} value={effectiveDate} max={ctx.today} onPick={(d) => { setDate(d); setCalOpen(false); }} onClose={() => setCalOpen(false)} />
      {/* mounted only while open, so its draft state always starts from the applied filters */}
      {sheetOpen && <FiltersSheet visible tab={tab} ctx={ctx} value={filters} onApply={(f) => { setFilters(f); setSheetOpen(false); }} onClose={() => setSheetOpen(false)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: c.background },
  segment: { flexDirection: 'row', margin: 16, marginBottom: 0, backgroundColor: c.tint6, borderRadius: 12, padding: 4 },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 9 },
  segBtnActive: { backgroundColor: '#fff' },
  segText: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: c.muted },
  searchRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 14 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingHorizontal: 12 },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', color: c.ink },
  iconBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  dateRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 10, alignItems: 'center' },
  dateBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: c.border, borderRadius: 12, height: 44 },
  dateText: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: c.ink },
  todayTag: { fontSize: 10, fontFamily: 'PlusJakartaSans_800ExtraBold', color: c.primary },
  chipRow: { gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  chip: { borderWidth: 1, borderColor: c.border, backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  chipActive: { backgroundColor: c.primary, borderColor: c.primary },
  chipText: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: c.ink },
  tileRow: { gap: 10, paddingHorizontal: 16, paddingBottom: 12 },
  tile: { minWidth: 92, backgroundColor: '#fff', borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 12 },
  tileLabel: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: c.muted },
  tileValue: { fontSize: 24, fontFamily: 'PlusJakartaSans_800ExtraBold', marginTop: 6 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: c.border },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.tint, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, fontFamily: 'PlusJakartaSans_800ExtraBold', color: c.primary },
  name: { fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold', color: c.ink },
  sub: { fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', color: c.muted },
  pctRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  pct: { fontSize: 13, fontFamily: 'PlusJakartaSans_800ExtraBold', minWidth: 42 },
  track: { flex: 1, height: 5, borderRadius: 3, backgroundColor: c.border, overflow: 'hidden', maxWidth: 90 },
  fill: { height: '100%' },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  pillText: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_700Bold' },
  detail: { fontSize: 11, fontFamily: 'PlusJakartaSans_500Medium', color: c.muted, textAlign: 'right' },
  empty: { textAlign: 'center', color: c.muted, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, marginTop: 32, paddingHorizontal: 24 },
  muted: { color: c.muted, fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold' },
  pager: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8 },
  pagerBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: c.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  pagerText: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: c.ink },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,27,51,.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  calCard: { width: '100%', maxWidth: 340, backgroundColor: '#fff', borderRadius: 18, padding: 16 },
  calHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  calTitle: { fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold', color: c.ink },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calDow: { width: `${100 / 7}%`, textAlign: 'center', fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', color: c.tertiary, paddingVertical: 6 },
  calCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  calCellActive: { backgroundColor: c.primary },
  calCellToday: { borderWidth: 1, borderColor: c.primary },
  calNum: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: c.ink },
  todayBtn: { marginTop: 10, backgroundColor: c.tint, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  todayBtnText: { color: c.primary, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13 },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(15,27,51,.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, maxHeight: '88%' },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sheetTitle: { fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', color: c.ink },
  sheetLabel: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: c.ink, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gradeBlock: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.border },
  sheetFoot: { flexDirection: 'row', gap: 10, marginTop: 10 },
  footBtn: { flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 12 },
  footGhost: { backgroundColor: c.tint },
  footText: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_800ExtraBold' },
});
