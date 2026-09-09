// Principal -> New announcement -- announcements.controller.ts's class-level
// @Roles('ADMIN', 'PRINCIPAL') already covers POST /announcements with no
// method-level override -- Principal has full create parity with Admin here,
// confirmed by direct backend audit.
//
// Audience: SCHOOL and ROLE (multi-select), matching exactly what Principal's
// own real web app offers -- school-eos-website's CreateAnnouncementForm
// (reused verbatim by principal/announcements/page.tsx, "Send a message to
// everyone, or to specific roles") supports only these two audience types
// with this same fixed 14-role list; SECTION is deliberately excluded here
// too, since the backend DTO's own comment marks it as "the Faculty module's
// own use" (further restricted there to sections the caller teaches), not a
// real Principal capability on web either. Fields (category, expiresAt,
// isEmergency, priority) mirror that same real form 1:1.

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { DateSelectorPill } from '@/components/DateSelectorPill';
import { ApiError } from '@/lib/api';
import { parentColors } from '@/lib/theme';
import {
  createAnnouncement,
  type AnnouncementAudienceType,
  type AnnouncementPriority,
} from '@/lib/principal-announcements-api';

const PRIORITIES: AnnouncementPriority[] = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

// Same fixed real role_code list CreateAnnouncementForm.tsx uses (a hard FK
// to the role table) -- every real role in this deployment, not invented.
const ROLES: [string, string][] = [
  ['ADMIN', 'Admin'],
  ['PRINCIPAL', 'Principal'],
  ['VICE_PRINCIPAL', 'Vice Principal'],
  ['FACULTY', 'Faculty'],
  ['PARENT', 'Parents'],
  ['FINANCE', 'Finance / Accounts'],
  ['ACADEMIC_COORDINATOR', 'Academic Coordinators'],
  ['CLASS_ADVISOR', 'Class Advisors'],
  ['SPORTS_FACULTY', 'Sports Faculty'],
  ['COMMUNITY_INCHARGE', 'Community In-Charges'],
  ['HEALTH_INCHARGE', 'Health In-Charge'],
  ['HOSTEL_WARDEN', 'Hostel Wardens'],
  ['BUS_ATTENDANT', 'Bus Attendants'],
  ['CANTEEN_VENDOR', 'Canteen Vendors'],
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function PrincipalAnnouncementCreate() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState<AnnouncementPriority>('NORMAL');
  const [isEmergency, setIsEmergency] = useState(false);
  const [audienceType, setAudienceType] = useState<AnnouncementAudienceType>('SCHOOL');
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiresAt, setExpiresAt] = useState(todayIso());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleRole(role: string) {
    setTargetRoles((current) => (current.includes(role) ? current.filter((r) => r !== role) : [...current, role]));
  }

  async function handleSubmit() {
    if (!title.trim() || !body.trim()) {
      setError('Title and body are both required.');
      return;
    }
    if (audienceType === 'ROLE' && targetRoles.length === 0) {
      setError('Select at least one role to send to.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createAnnouncement({
        title: title.trim(),
        body: body.trim(),
        category: category.trim() || undefined,
        priority,
        isEmergency,
        expiresAt: hasExpiry ? expiresAt : undefined,
        audienceType,
        targetRoles: audienceType === 'ROLE' ? targetRoles : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['principal-announcements'] });
      router.back();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to publish this announcement.');
    } finally {
      setSubmitting(false);
    }
  }

  const subtitle =
    audienceType === 'SCHOOL' ? 'Everyone (whole school)' : `${targetRoles.length} role${targetRoles.length === 1 ? '' : 's'} selected`;

  return (
    <View style={styles.flex}>
      <AppHeader title="New Announcement" subtitle={subtitle} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Title *</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. School closed Friday for maintenance"
          placeholderTextColor={parentColors.mutedLight}
          style={styles.input}
        />

        <Text style={styles.label}>Body *</Text>
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Full announcement text"
          placeholderTextColor={parentColors.mutedLight}
          style={[styles.input, styles.textArea]}
          multiline
        />

        <Text style={styles.label}>Category</Text>
        <TextInput
          value={category}
          onChangeText={setCategory}
          placeholder="e.g. Operations (optional)"
          placeholderTextColor={parentColors.mutedLight}
          style={styles.input}
        />

        <Text style={styles.label}>Priority</Text>
        <View style={styles.priorityRow}>
          {PRIORITIES.map((p) => (
            <Pressable key={p} onPress={() => setPriority(p)} style={[styles.priorityChip, priority === p && styles.priorityChipActive]}>
              <Text style={[styles.priorityChipText, priority === p && styles.priorityChipTextActive]}>
                {p[0] + p.slice(1).toLowerCase()}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Send to *</Text>
        <View style={styles.priorityRow}>
          <Pressable
            onPress={() => setAudienceType('SCHOOL')}
            style={[styles.priorityChip, audienceType === 'SCHOOL' && styles.priorityChipActive]}
          >
            <Text style={[styles.priorityChipText, audienceType === 'SCHOOL' && styles.priorityChipTextActive]}>Everyone</Text>
          </Pressable>
          <Pressable
            onPress={() => setAudienceType('ROLE')}
            style={[styles.priorityChip, audienceType === 'ROLE' && styles.priorityChipActive]}
          >
            <Text style={[styles.priorityChipText, audienceType === 'ROLE' && styles.priorityChipTextActive]}>Specific role(s)</Text>
          </Pressable>
        </View>

        {audienceType === 'ROLE' ? (
          <View style={styles.rolesGrid}>
            {ROLES.map(([code, label]) => {
              const selected = targetRoles.includes(code);
              return (
                <Pressable key={code} onPress={() => toggleRole(code)} style={styles.roleCheckboxRow}>
                  <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
                    {selected ? <Text style={styles.checkboxMark}>✓</Text> : null}
                  </View>
                  <Text style={styles.roleCheckboxLabel}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <View style={styles.switchRow}>
          <Text style={styles.label}>Set an expiry date</Text>
          <Switch value={hasExpiry} onValueChange={setHasExpiry} trackColor={{ true: parentColors.blue }} />
        </View>
        {hasExpiry ? <DateSelectorPill date={expiresAt} onChange={setExpiresAt} /> : null}

        <View style={styles.switchRow}>
          <Text style={styles.label}>Mark as emergency</Text>
          <Switch value={isEmergency} onValueChange={setIsEmergency} trackColor={{ true: parentColors.blue }} />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable style={[styles.submitButton, submitting && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={submitting}>
          <Text style={styles.submitButtonText}>{submitting ? 'Publishing…' : 'Publish announcement'}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 32 },
  label: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink, marginTop: 14, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: parentColors.fieldBorder,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: parentColors.ink,
    backgroundColor: '#fff',
  },
  textArea: { minHeight: 110, textAlignVertical: 'top' },
  priorityRow: { flexDirection: 'row', gap: 8 },
  priorityChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: parentColors.border,
    borderRadius: 999,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  priorityChipActive: { backgroundColor: parentColors.blue, borderColor: parentColors.blue },
  priorityChipText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  priorityChipTextActive: { color: '#fff' },
  rolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: parentColors.fieldBorder,
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff',
  },
  roleCheckboxRow: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '46%' },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: parentColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: parentColors.blue, borderColor: parentColors.blue },
  checkboxMark: { color: '#fff', fontSize: 12, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  roleCheckboxLabel: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.ink, flexShrink: 1 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 },
  errorText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#B33A2E', marginTop: 14 },
  submitButton: { backgroundColor: parentColors.blue, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 24 },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: '#fff' },
});
