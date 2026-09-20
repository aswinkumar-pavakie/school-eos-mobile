// Sports Admin -> Notices. Real listSportsNotices()/postSportsNotice() --
// same shared school announcements backend every other role's Notices
// screen already uses.

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sportsColors } from '@/lib/theme';
import { Card, EmptyPanel, SportsSubHeader } from '@/components/sports/primitives';
import { listSportsNotices, postSportsNotice } from '@/lib/sports-notices-api';

export default function SportsNoticesScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<'SCHOOL' | 'SPORTS_ADMIN'>('SPORTS_ADMIN');

  const noticesQuery = useQuery({ queryKey: ['sports-notices'], queryFn: listSportsNotices });

  const postMutation = useMutation({
    mutationFn: () => {
      if (!title.trim() || !body.trim()) throw new Error('Enter a title and message.');
      return postSportsNotice({ title: title.trim(), body: body.trim(), audience });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sports-notices'] });
      setShowAdd(false);
      setTitle('');
      setBody('');
    },
  });

  return (
    <View style={styles.flex}>
      <SportsSubHeader title="Notices" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.addButton} onPress={() => setShowAdd((v) => !v)}>
          <Text style={styles.addButtonText}>{showAdd ? 'Close' : '+ Post notice'}</Text>
        </Pressable>
        {showAdd ? (
          <Card style={{ gap: 10 }}>
            <Text style={styles.label}>Title</Text>
            <TextInput value={title} onChangeText={setTitle} placeholder="Trials rescheduled" placeholderTextColor={sportsColors.faint} style={styles.input} />
            <Text style={styles.label}>Message</Text>
            <TextInput value={body} onChangeText={setBody} placeholder="Write the notice…" placeholderTextColor={sportsColors.faint} style={[styles.input, { minHeight: 90, textAlignVertical: 'top' }]} multiline />
            <Text style={styles.label}>Audience</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={() => setAudience('SPORTS_ADMIN')} style={[styles.chip, audience === 'SPORTS_ADMIN' && styles.chipActive]}>
                <Text style={[styles.chipText, audience === 'SPORTS_ADMIN' && styles.chipTextActive]}>Sports dept</Text>
              </Pressable>
              <Pressable onPress={() => setAudience('SCHOOL')} style={[styles.chip, audience === 'SCHOOL' && styles.chipActive]}>
                <Text style={[styles.chipText, audience === 'SCHOOL' && styles.chipTextActive]}>Whole school</Text>
              </Pressable>
            </View>
            {postMutation.isError ? <Text style={styles.error}>{(postMutation.error as Error).message}</Text> : null}
            <Pressable style={styles.saveButton} onPress={() => postMutation.mutate()}>
              <Text style={styles.addButtonText}>{postMutation.isPending ? 'Posting…' : 'Post notice'}</Text>
            </Pressable>
          </Card>
        ) : null}
        <Text style={styles.sectionTitle}>History</Text>
        {(noticesQuery.data ?? []).length === 0 ? (
          <EmptyPanel label="No notices posted yet." />
        ) : (
          (noticesQuery.data ?? []).map((n) => (
            <Card key={n.id}>
              <Text style={styles.noticeTitle}>{n.title}</Text>
              <Text style={styles.noticeMeta}>
                {new Date(n.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                {n.createdByName ? ` · ${n.createdByName}` : ''}
                {' · '}{n.audienceType === 'SCHOOL' ? 'Whole school' : 'Sports dept'}
              </Text>
              <Text style={styles.noticeBody}>{n.body}</Text>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: sportsColors.surface },
  content: { padding: 16, paddingBottom: 32, gap: 14 },
  addButton: { backgroundColor: sportsColors.primary, borderRadius: 13, paddingVertical: 14, alignItems: 'center' },
  addButtonText: { color: '#fff', fontSize: 14.5, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  saveButton: { backgroundColor: sportsColors.primary, borderRadius: 11, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  label: { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: 1, color: sportsColors.tertiary },
  input: { borderWidth: 1, borderColor: sportsColors.inputBorder, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13.5, color: sportsColors.ink },
  chip: { borderWidth: 1, borderColor: sportsColors.inputBorder, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 8 },
  chipActive: { backgroundColor: sportsColors.primary, borderColor: sportsColors.primary },
  chipText: { fontSize: 12.5, color: sportsColors.bodyStrong, fontFamily: 'PlusJakartaSans_600SemiBold' },
  chipTextActive: { color: '#fff' },
  error: { fontSize: 12.5, color: sportsColors.red },
  sectionTitle: { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', color: sportsColors.ink, marginTop: 4 },
  noticeTitle: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: sportsColors.ink },
  noticeMeta: { fontSize: 12, color: sportsColors.mutedStrong, marginTop: 4 },
  noticeBody: { fontSize: 12.5, color: sportsColors.body, marginTop: 6, lineHeight: 18 },
});
