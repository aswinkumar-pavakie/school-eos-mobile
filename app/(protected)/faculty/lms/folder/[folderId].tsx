// Current Term (LMS) -- Materials sub-folder detail. Editable title,
// description and per-class share list (changes here take effect
// immediately, even for files already uploaded -- there is no per-file share
// list, only the folder's own). Real file upload/open/delete against the
// private lms-materials bucket, signed URLs only, 10-minute TTL.

import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { CloseIcon, EditIcon, FileIcon, TrashIcon, UploadIcon } from '@/components/faculty/icons';
import {
  listLmsSubjects,
  getLmsFolder,
  updateLmsFolder,
  deleteLmsFolder,
  uploadLmsFile,
  getLmsFileUrl,
  deleteLmsFile,
  type LmsFile,
} from '@/lib/faculty-lms-api';
import { pickDocument } from '@/lib/lms-file-picker';
import { formatDateTime, formatFileSize } from '@/lib/format';
import { facultyColors } from '@/lib/theme';

export default function LmsFolderDetailScreen() {
  const { folderId } = useLocalSearchParams<{ folderId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [shareIds, setShareIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [openingFileId, setOpeningFileId] = useState<string | null>(null);
  const [deletingFolder, setDeletingFolder] = useState(false);

  const folderQuery = useQuery({ queryKey: ['faculty-lms-folder', folderId], queryFn: () => getLmsFolder(folderId!), enabled: !!folderId });
  const folder = folderQuery.data;

  const subjectsQuery = useQuery({ queryKey: ['faculty-lms-subjects'], queryFn: listLmsSubjects });
  const subject = subjectsQuery.data?.find((s) => s.subjectId === folder?.subjectId);
  const classes = subject?.classes ?? [];

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['faculty-lms-folder', folderId] });
    if (folder) queryClient.invalidateQueries({ queryKey: ['faculty-lms-folders', folder.subjectId] });
  }

  function openEditor() {
    if (!folder) return;
    setTitle(folder.title);
    setDescription(folder.description ?? '');
    setShareIds(folder.shareOfferingIds);
    setEditorOpen(true);
  }

  function toggleShare(id: string) {
    setShareIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  const canSave = title.trim().length > 0 && shareIds.length > 0;

  async function handleSaveEdit() {
    if (!canSave || !folderId) return;
    setSaving(true);
    try {
      await updateLmsFolder(folderId, { title: title.trim(), description: description.trim() || undefined, shareOfferingIds: shareIds });
      invalidate();
      setEditorOpen(false);
    } catch (err) {
      Alert.alert('Could not save changes', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDeleteFolder() {
    if (!folder) return;
    Alert.alert('Delete this folder?', `"${folder.title}" and every file inside it will be permanently removed for every shared class.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeletingFolder(true);
          try {
            await deleteLmsFolder(folder.id);
            queryClient.invalidateQueries({ queryKey: ['faculty-lms-folders', folder.subjectId] });
            router.back();
          } catch (err) {
            Alert.alert('Could not delete', err instanceof Error ? err.message : 'Please try again.');
            setDeletingFolder(false);
          }
        },
      },
    ]);
  }

  async function handleUpload() {
    if (!folderId) return;
    const picked = await pickDocument();
    if (!picked) return;
    setUploading(true);
    try {
      await uploadLmsFile(folderId, picked);
      invalidate();
    } catch (err) {
      Alert.alert('Upload failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function handleOpenFile(file: LmsFile) {
    setOpeningFileId(file.id);
    try {
      const url = await getLmsFileUrl(file.id);
      await Linking.openURL(url);
    } catch (err) {
      Alert.alert('Could not open file', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setOpeningFileId(null);
    }
  }

  function confirmDeleteFile(file: LmsFile) {
    Alert.alert('Delete this file?', `"${file.fileName}" will be permanently removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeletingFileId(file.id);
          try {
            await deleteLmsFile(file.id);
            invalidate();
          } catch (err) {
            Alert.alert('Could not delete', err instanceof Error ? err.message : 'Please try again.');
          } finally {
            setDeletingFileId(null);
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.flex}>
      <AppHeader title={folder?.title ?? 'Folder'} subtitle="Materials" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={folderQuery.isFetching} onRefresh={() => folderQuery.refetch()} />}>
        {folderQuery.isLoading || !folder ? (
          <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 24 }} />
        ) : (
          <>
            <View style={styles.infoCard}>
              <View style={styles.infoTop}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  {folder.description ? <Text style={styles.infoDescription}>{folder.description}</Text> : null}
                  <Text style={styles.infoShare}>
                    Shared with {folder.shareOfferingIds.length} of {classes.length} class{classes.length === 1 ? '' : 'es'}
                  </Text>
                </View>
                <Pressable hitSlop={8} onPress={openEditor}><EditIcon /></Pressable>
                <Pressable hitSlop={8} onPress={confirmDeleteFolder} disabled={deletingFolder}>
                  {deletingFolder ? <ActivityIndicator size="small" color={facultyColors.red} /> : <TrashIcon />}
                </Pressable>
              </View>
              <View style={styles.shareChipRow}>
                {classes.map((c) => {
                  const shared = folder.shareOfferingIds.includes(c.subjectOfferingId);
                  return (
                    <View key={c.subjectOfferingId} style={[styles.shareChip, shared && styles.shareChipActive]}>
                      <Text style={[styles.shareChipText, shared && styles.shareChipTextActive]}>{c.gradeName} {c.sectionName}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <Pressable style={styles.uploadButton} onPress={handleUpload} disabled={uploading}>
              {uploading ? <ActivityIndicator color="#fff" /> : (
                <>
                  <UploadIcon />
                  <Text style={styles.uploadButtonText}>Upload a file</Text>
                </>
              )}
            </Pressable>

            <Text style={styles.sectionLabel}>FILES</Text>
            {folder.files.length === 0 ? (
              <Text style={styles.emptyText}>No files uploaded yet.</Text>
            ) : (
              <View style={{ gap: 8 }}>
                {folder.files.map((f) => (
                  <View key={f.id} style={styles.fileRow}>
                    <FileIcon />
                    <Pressable style={{ flex: 1, minWidth: 0 }} onPress={() => handleOpenFile(f)} disabled={openingFileId === f.id}>
                      <Text style={styles.fileName} numberOfLines={1}>{f.fileName}</Text>
                      <Text style={styles.fileMeta}>{formatFileSize(f.sizeBytes)} · {formatDateTime(f.uploadedAt)}</Text>
                    </Pressable>
                    {openingFileId === f.id ? (
                      <ActivityIndicator size="small" color={facultyColors.blue} />
                    ) : (
                      <Pressable hitSlop={8} onPress={() => confirmDeleteFile(f)} disabled={deletingFileId === f.id}>
                        {deletingFileId === f.id ? <ActivityIndicator size="small" color={facultyColors.red} /> : <TrashIcon />}
                      </Pressable>
                    )}
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={editorOpen} animationType="slide" transparent onRequestClose={() => setEditorOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.sheetHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetTitle}>Edit folder</Text>
                  <Text style={styles.sheetSubtitle}>Changes apply immediately, including to files already uploaded</Text>
                </View>
                <Pressable style={styles.closeBtn} onPress={() => setEditorOpen(false)}>
                  <CloseIcon />
                </Pressable>
              </View>

              <Text style={styles.fieldLabel}>TITLE</Text>
              <TextInput value={title} onChangeText={setTitle} placeholder="e.g. Unit 1" style={styles.input} />

              <Text style={styles.fieldLabel}>DESCRIPTION</Text>
              <TextInput value={description} onChangeText={setDescription} placeholder="Optional" multiline numberOfLines={3} style={[styles.input, styles.textarea]} />

              <Text style={styles.fieldLabel}>SHARE WITH</Text>
              <View style={{ gap: 8 }}>
                {classes.map((c) => {
                  const checked = shareIds.includes(c.subjectOfferingId);
                  return (
                    <Pressable key={c.subjectOfferingId} style={[styles.shareRow, checked && styles.shareRowChecked]} onPress={() => toggleShare(c.subjectOfferingId)}>
                      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                        {checked ? <Text style={styles.checkboxMark}>✓</Text> : null}
                      </View>
                      <Text style={styles.shareRowText}>{c.gradeName} {c.sectionName}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable style={[styles.submitBtn, !canSave && styles.submitBtnDisabled]} disabled={!canSave || saving} onPress={handleSaveEdit}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Save changes</Text>}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: facultyColors.background },
  content: { padding: 14, paddingBottom: 32, gap: 12 },
  emptyText: { textAlign: 'center', color: facultyColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 8 },
  infoCard: { backgroundColor: facultyColors.surface, borderWidth: 1, borderColor: facultyColors.border, borderRadius: 16, padding: 15 },
  infoTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  infoDescription: { fontSize: 13, color: facultyColors.body, lineHeight: 19, fontFamily: 'PlusJakartaSans_500Medium' },
  infoShare: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted, marginTop: 6 },
  shareChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 11 },
  shareChip: { borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10, backgroundColor: facultyColors.borderSoft },
  shareChipActive: { backgroundColor: facultyColors.blueLight },
  shareChipText: { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.muted },
  shareChipTextActive: { color: facultyColors.blueDark },
  uploadButton: { backgroundColor: facultyColors.blue, borderRadius: 14, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  uploadButtonText: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: '#fff' },
  sectionLabel: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.muted, letterSpacing: 1.2, marginTop: 4, marginLeft: 4 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: facultyColors.surface, borderWidth: 1, borderColor: facultyColors.border, borderRadius: 14, padding: 12 },
  fileName: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.ink },
  fileMeta: { fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted, marginTop: 2 },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: facultyColors.borderLight, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 12 },
  shareRowChecked: { borderColor: facultyColors.blue, backgroundColor: facultyColors.blueLight },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.6, borderColor: facultyColors.borderLight, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: facultyColors.blue, borderColor: facultyColors.blue },
  checkboxMark: { color: '#fff', fontSize: 12, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  shareRowText: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.ink },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '88%', backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 24 },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  sheetTitle: { fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink },
  sheetSubtitle: { fontSize: 12.5, color: facultyColors.mutedStrong, marginTop: 3, fontFamily: 'PlusJakartaSans_600SemiBold' },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: facultyColors.borderSoft, alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.muted, letterSpacing: 1, marginTop: 16, marginBottom: 7 },
  input: { borderWidth: 1, borderColor: facultyColors.borderLight, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 14, fontSize: 14, color: facultyColors.ink },
  textarea: { height: 74, textAlignVertical: 'top' },
  submitBtn: { marginTop: 18, alignItems: 'center', paddingVertical: 14, borderRadius: 14, backgroundColor: facultyColors.blue },
  submitBtnDisabled: { backgroundColor: facultyColors.disabled },
  submitBtnText: { color: '#fff', fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold' },
});
