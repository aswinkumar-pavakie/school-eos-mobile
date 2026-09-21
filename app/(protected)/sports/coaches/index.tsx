// Sports Admin -> Coaches & PT staff. Real listCoaches()/createCoach()/
// updateCoach() -- POST/PATCH /coaches already real and SPORTS_ADMIN-
// authorized on the backend (coaches.controller.ts), the same endpoints the
// website Sports Admin console already uses; this screen just never called
// them before. Status toggle uses the same real ACTIVE/INACTIVE values as
// the website's own Deactivate/Reactivate convention.

import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sportsColors } from '@/lib/theme';
import { Card, EmptyPanel, SportsSubHeader, StatusPill } from '@/components/sports/primitives';
import { createCoach, listCoaches, updateCoach, type Coach } from '@/lib/sports-api';
import { ApiError } from '@/lib/api';

export default function CoachesScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [fullName, setFullName] = useState('');
  const [isExternal, setIsExternal] = useState(true);
  const [contactPhone, setContactPhone] = useState('');
  const [qualification, setQualification] = useState('');

  const coachesQuery = useQuery({ queryKey: ['sports-coaches'], queryFn: listCoaches });

  const createMutation = useMutation({
    mutationFn: () => {
      if (!fullName.trim()) throw new Error('Enter a name.');
      return createCoach({
        fullName: fullName.trim(),
        isExternal,
        contactPhone: contactPhone.trim() || undefined,
        qualification: qualification.trim() || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sports-coaches'] });
      setShowAdd(false);
      setFullName('');
      setIsExternal(true);
      setContactPhone('');
      setQualification('');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'INACTIVE' }) => updateCoach(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sports-coaches'] }),
  });

  return (
    <View style={styles.flex}>
      <SportsSubHeader title="Coaches & PT staff" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={coachesQuery.isFetching} onRefresh={() => coachesQuery.refetch()} />}
      >
        <Pressable style={styles.addButton} onPress={() => setShowAdd((v) => !v)}>
          <Text style={styles.addButtonText}>{showAdd ? 'Close' : '+ Add coach'}</Text>
        </Pressable>
        {showAdd ? (
          <Card style={{ gap: 10 }}>
            <Text style={styles.label}>Full name</Text>
            <TextInput value={fullName} onChangeText={setFullName} placeholder="Coach name" placeholderTextColor={sportsColors.faint} style={styles.input} />
            <View style={styles.switchRow}>
              <Text style={styles.label}>External coach</Text>
              <Switch value={isExternal} onValueChange={setIsExternal} />
            </View>
            <Text style={styles.label}>Contact phone (optional)</Text>
            <TextInput value={contactPhone} onChangeText={setContactPhone} placeholder="9876543210" placeholderTextColor={sportsColors.faint} style={styles.input} keyboardType="phone-pad" />
            <Text style={styles.label}>Qualification (optional)</Text>
            <TextInput value={qualification} onChangeText={setQualification} placeholder="B.P.Ed" placeholderTextColor={sportsColors.faint} style={styles.input} />
            {createMutation.isError ? <Text style={styles.error}>{(createMutation.error as Error).message}</Text> : null}
            <Pressable style={styles.saveButton} onPress={() => createMutation.mutate()}>
              <Text style={styles.addButtonText}>{createMutation.isPending ? 'Saving…' : 'Add coach'}</Text>
            </Pressable>
          </Card>
        ) : null}

        {coachesQuery.isLoading ? (
          <ActivityIndicator color={sportsColors.primary} style={{ marginTop: 24 }} />
        ) : coachesQuery.isError ? (
          <Text style={styles.error}>{coachesQuery.error instanceof ApiError ? coachesQuery.error.message : 'Unable to load coaches.'}</Text>
        ) : (coachesQuery.data ?? []).length === 0 ? (
          <EmptyPanel label="No coaches added yet." />
        ) : (
          (coachesQuery.data ?? []).map((c: Coach) => (
            <Card key={c.id} style={{ gap: 10 }}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{c.fullName}</Text>
                  <Text style={styles.meta}>{c.qualification ?? '—'} · {c.isExternal ? 'External' : 'In-house'}</Text>
                </View>
                <StatusPill label={c.status === 'ACTIVE' ? 'active' : 'inactive'} />
                {c.contactPhone ? (
                  <Pressable style={styles.callButton} onPress={() => Linking.openURL(`tel:${c.contactPhone}`)}>
                    <Text style={styles.callGlyph}>☎</Text>
                  </Pressable>
                ) : null}
              </View>
              <Pressable
                disabled={statusMutation.isPending}
                style={styles.toggleButton}
                onPress={() => statusMutation.mutate({ id: c.id, status: c.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}
              >
                <Text style={styles.toggleButtonText}>{c.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}</Text>
              </Pressable>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: sportsColors.surface },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  addButton: { backgroundColor: sportsColors.primary, borderRadius: 13, paddingVertical: 14, alignItems: 'center' },
  addButtonText: { color: '#fff', fontSize: 14.5, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  saveButton: { backgroundColor: sportsColors.primary, borderRadius: 11, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  label: { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: 1, color: sportsColors.tertiary },
  input: { borderWidth: 1, borderColor: sportsColors.inputBorder, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13.5, color: sportsColors.ink },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: sportsColors.ink },
  meta: { fontSize: 12, color: sportsColors.muted, marginTop: 2 },
  callButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: sportsColors.tint, alignItems: 'center', justifyContent: 'center' },
  callGlyph: { fontSize: 15, color: sportsColors.primary },
  toggleButton: { borderWidth: 1, borderColor: sportsColors.inputBorder, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  toggleButtonText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: sportsColors.bodyStrong },
  error: { fontSize: 12.5, color: sportsColors.red, textAlign: 'center', marginTop: 24 },
});
