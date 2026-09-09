// Subject detail -- real folders (Materials, expand-in-place to list + open
// files via signed URL) and lesson plans. No homework preview here: the real
// SubjectDetail API response has no homework field -- Homework is its own,
// separately-built screen, deliberately out of scope for this one.
// Pixel reference: "School App.dc.html" isSubject block (lines 803-844) --
// the "CURRENT UNIT" highlight box and Homework/Assignments sections in that
// mock have no backing real fields, so the highlight box is repurposed to
// show the one real fact it can (teacher + weekly periods) and the
// Homework/Assignments sections are omitted rather than faked.

import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Svg, { Path, Rect } from 'react-native-svg';
import { AppHeader } from '@/components/AppHeader';
import { useSelectedChild } from '@/hooks/useSelectedChild';
import { formatDate, formatFileSize } from '@/lib/format';
import { getFolderFiles, getSubjectDetail, getSubjectFileUrl, type SubjectFile, type SubjectFolder } from '@/lib/parent-api';
import { parentColors } from '@/lib/theme';

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={parentColors.muted} strokeWidth={2.2}>
      <Path d={open ? 'M6 9l6 6 6-6' : 'M9 6l6 6-6 6'} />
    </Svg>
  );
}

function FolderIcon() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={parentColors.blueDeep} strokeWidth={1.9}>
      <Path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    </Svg>
  );
}

function FileIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={parentColors.blueDeep} strokeWidth={1.9}>
      <Rect x="5" y="3" width="14" height="18" rx="2" />
      <Path d="M8 9h8M8 13h5" />
    </Svg>
  );
}

export default function SubjectDetailScreen() {
  const { subjectOfferingId } = useLocalSearchParams<{ subjectOfferingId: string }>();
  const router = useRouter();
  const { selected } = useSelectedChild();
  const studentId = selected?.studentId ?? null;
  const [expandedFolderId, setExpandedFolderId] = useState<string | null>(null);
  const [openingFileId, setOpeningFileId] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: ['subject-detail', studentId, subjectOfferingId],
    queryFn: () => getSubjectDetail(studentId!, subjectOfferingId!),
    enabled: !!studentId && !!subjectOfferingId,
  });

  const detail = detailQuery.data;
  const classLabel = selected ? [selected.gradeName, selected.sectionName].filter(Boolean).join(' ') : '';

  async function handleOpenFile(file: SubjectFile) {
    if (!studentId || !subjectOfferingId) return;
    setOpeningFileId(file.id);
    try {
      const url = await getSubjectFileUrl(studentId, subjectOfferingId, file.id);
      await Linking.openURL(url);
    } finally {
      setOpeningFileId(null);
    }
  }

  return (
    <View style={styles.flex}>
      <AppHeader
        title={detail?.offering.subjectName ?? 'Subject'}
        subtitle={detail ? [detail.offering.teacherName, classLabel].filter(Boolean).join(' · ') : undefined}
        onBack={() => router.back()}
      />
      {!selected || detailQuery.isLoading || !detail ? (
        <ActivityIndicator color={parentColors.blue} style={styles.spinner} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>SUBJECT</Text>
            <Text style={styles.infoMain}>{detail.offering.teacherName ?? 'No teacher assigned'}</Text>
            <Text style={styles.infoSub}>
              {detail.offering.weeklyPeriods != null
                ? `${detail.offering.weeklyPeriods} period${detail.offering.weeklyPeriods === 1 ? '' : 's'} a week`
                : 'Schedule not set'}
            </Text>
          </View>

          <Text style={styles.sectionLabel}>MATERIALS</Text>
          {detail.folders.length === 0 ? (
            <Text style={styles.emptyText}>No materials shared yet.</Text>
          ) : (
            <View style={{ gap: 10 }}>
              {detail.folders.map((folder) => (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  expanded={expandedFolderId === folder.id}
                  onToggle={() => setExpandedFolderId((cur) => (cur === folder.id ? null : folder.id))}
                  studentId={studentId}
                  subjectOfferingId={subjectOfferingId!}
                  openingFileId={openingFileId}
                  onOpenFile={handleOpenFile}
                />
              ))}
            </View>
          )}

          <Text style={styles.sectionLabel}>LESSON PLANS</Text>
          {detail.lessonPlans.length === 0 ? (
            <Text style={styles.emptyText}>No lesson plans published yet.</Text>
          ) : (
            <View style={styles.lessonCard}>
              {detail.lessonPlans.map((plan, i) => (
                <View key={plan.id} style={[styles.lessonRow, i > 0 && styles.lessonRowBorder]}>
                  <Text style={styles.lessonWeek}>{plan.weekStart ? formatDate(plan.weekStart) : '—'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lessonTitle}>{plan.title}</Text>
                    {plan.content ? (
                      <Text style={styles.lessonContent} numberOfLines={3}>
                        {plan.content}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function FolderCard({
  folder,
  expanded,
  onToggle,
  studentId,
  subjectOfferingId,
  openingFileId,
  onOpenFile,
}: {
  folder: SubjectFolder;
  expanded: boolean;
  onToggle: () => void;
  studentId: string | null;
  subjectOfferingId: string;
  openingFileId: string | null;
  onOpenFile: (file: SubjectFile) => void;
}) {
  const filesQuery = useQuery({
    queryKey: ['subject-folder-files', studentId, subjectOfferingId, folder.id],
    queryFn: () => getFolderFiles(studentId!, subjectOfferingId, folder.id),
    enabled: expanded && !!studentId,
  });

  return (
    <View style={styles.folderCard}>
      <Pressable style={styles.folderTop} onPress={onToggle}>
        <View style={styles.folderIconBox}>
          <FolderIcon />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.folderTitle} numberOfLines={1}>
            {folder.title}
          </Text>
          <Text style={styles.folderMeta}>
            {folder.fileCount} file{folder.fileCount === 1 ? '' : 's'}
          </Text>
        </View>
        <ChevronIcon open={expanded} />
      </Pressable>
      {folder.description ? <Text style={styles.folderDescription}>{folder.description}</Text> : null}
      {expanded ? (
        filesQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 10 }} />
        ) : (filesQuery.data ?? []).length === 0 ? (
          <Text style={styles.folderEmpty}>No files in this folder yet.</Text>
        ) : (
          <View style={{ marginTop: 4 }}>
            {(filesQuery.data ?? []).map((file) => (
              <Pressable
                key={file.id}
                style={styles.fileRow}
                onPress={() => onOpenFile(file)}
                disabled={openingFileId === file.id}
              >
                <FileIcon />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {file.fileName}
                  </Text>
                  <Text style={styles.fileMeta}>
                    {formatFileSize(file.sizeBytes)} · {formatDate(file.uploadedAt)}
                  </Text>
                </View>
                {openingFileId === file.id ? <ActivityIndicator size="small" color={parentColors.blueDeep} /> : null}
              </Pressable>
            ))}
          </View>
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  spinner: { marginTop: 24 },
  content: { padding: 16, paddingTop: 14, paddingBottom: 32, gap: 14 },
  infoCard: { backgroundColor: parentColors.pillBlueBg, borderRadius: 16, padding: 16, paddingHorizontal: 18 },
  infoLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.blueDeep, letterSpacing: 1.4 },
  infoMain: { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink, marginTop: 6 },
  infoSub: { fontSize: 13, color: parentColors.bodyMuted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 5 },
  sectionLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.muted, letterSpacing: 1.4 },
  emptyText: { color: parentColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13.5 },
  folderCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: parentColors.border, padding: 14 },
  folderTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  folderIconBox: { width: 42, height: 42, borderRadius: 12, backgroundColor: parentColors.pillBlueBg, alignItems: 'center', justifyContent: 'center' },
  folderTitle: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  folderMeta: { fontSize: 12, color: parentColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 3 },
  folderDescription: { fontSize: 12.5, color: parentColors.bodyMuted, fontFamily: 'PlusJakartaSans_500Medium', marginTop: 10 },
  folderEmpty: { fontSize: 12.5, color: parentColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 10 },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: parentColors.borderSoft,
  },
  fileName: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  fileMeta: { fontSize: 11, color: parentColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 2 },
  lessonCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: parentColors.border, overflow: 'hidden' },
  lessonRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 13, paddingHorizontal: 16 },
  lessonRowBorder: { borderTopWidth: 1, borderTopColor: parentColors.borderSoft },
  lessonWeek: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.blueDeep, width: 62, flexShrink: 0 },
  lessonTitle: { fontSize: 14, color: parentColors.ink, fontFamily: 'PlusJakartaSans_700Bold' },
  lessonContent: { fontSize: 12.5, color: parentColors.bodyMuted, fontFamily: 'PlusJakartaSans_500Medium', marginTop: 4, lineHeight: 18 },
});
