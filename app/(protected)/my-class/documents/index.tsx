// Documents (Certificates) -- real parent-documents.controller.ts. Lists this
// child's own certificate requests, lets the parent request a new one (pick a
// type, then give a reason -- the real API requires a non-empty reason), and
// opens the real signed download URL once a request is APPROVED with a file
// attached. No fabricated certificate body anywhere -- "View" only ever shows
// this request's own real reason/decisionNote, never an invented "This is to
// certify that..." template (no certificate-generation service exists yet).
//
// `document_request` is a brand new table -- until its migration has run in a
// given environment, every call here 500s with a Postgres "relation does not
// exist" error. That surfaces through the normal ErrorState/retry path below,
// same as any other real API failure, rather than crashing the screen.

import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Svg, { Path } from 'react-native-svg';
import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ScreenStates';
import { useSelectedChild } from '@/hooks/useSelectedChild';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import {
  DOCUMENT_TYPES,
  createDocumentRequest,
  getDocumentDownloadUrl,
  listDocumentRequests,
  type DocumentRequest,
  type DocumentType,
} from '@/lib/parent-api';
import { cardShadow, parentColors } from '@/lib/theme';

function docTypeLabel(type: DocumentType): string {
  return type
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function docStateMeta(state: DocumentRequest['state']): { bg: string; fg: string; label: string } {
  if (state === 'APPROVED') return { bg: parentColors.greenBg, fg: parentColors.greenDark, label: 'Approved' };
  if (state === 'REJECTED') return { bg: parentColors.redBg, fg: parentColors.redDark, label: 'Rejected' };
  return { bg: parentColors.amberBg, fg: parentColors.amberDark, label: 'Pending' };
}

function DocIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={parentColors.blueDeep} strokeWidth={1.8}>
      <Path d="M6 3h9l4 4v14H6z" />
      <Path d="M14 3v5h5" />
    </Svg>
  );
}

export default function DocumentsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { selected, isLoading: childLoading } = useSelectedChild();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickedType, setPickedType] = useState<DocumentType | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [viewing, setViewing] = useState<DocumentRequest | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const studentId = selected?.studentId;
  const listQuery = useQuery({
    queryKey: ['parent-documents', studentId],
    queryFn: () => listDocumentRequests(studentId as string),
    enabled: !!studentId,
  });
  const requests = listQuery.data ?? [];

  function openPicker() {
    setPickedType(null);
    setReason('');
    setPickerOpen(true);
  }

  function closePicker() {
    setPickerOpen(false);
    setPickedType(null);
    setReason('');
  }

  const canSubmit = pickedType !== null && reason.trim().length > 0;

  async function submitRequest() {
    if (!studentId || !pickedType || !canSubmit) return;
    setSubmitting(true);
    try {
      await createDocumentRequest(studentId, pickedType, reason.trim());
      queryClient.invalidateQueries({ queryKey: ['parent-documents', studentId] });
      closePicker();
    } catch (err) {
      Alert.alert('Could not submit request', err instanceof ApiError ? err.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDownload(request: DocumentRequest) {
    if (!studentId || request.state !== 'APPROVED' || !request.documentObjectKey) return;
    setDownloadingId(request.id);
    try {
      const url = await getDocumentDownloadUrl(studentId, request.id);
      await Linking.openURL(url);
    } catch (err) {
      Alert.alert('Could not open document', err instanceof ApiError ? err.message : 'Please try again.');
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <View style={styles.flex}>
      <AppHeader title="Documents" subtitle="Certificate requests" onBack={() => router.back()} />

      {childLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={parentColors.blue} />
        </View>
      ) : !studentId ? (
        <View style={styles.loading}>
          <Text style={styles.emptyText}>No child linked to your account.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={listQuery.isFetching} onRefresh={() => listQuery.refetch()} />}
        >
          {listQuery.isLoading ? (
            <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
          ) : listQuery.isError ? (
            <ErrorState
              message={listQuery.error instanceof ApiError ? listQuery.error.message : 'Unable to load document requests.'}
              onRetry={() => listQuery.refetch()}
            />
          ) : requests.length === 0 ? (
            <Text style={styles.emptyText}>No certificate requests yet.</Text>
          ) : (
            requests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                onView={() => setViewing(request)}
                onDownload={() => handleDownload(request)}
                downloading={downloadingId === request.id}
              />
            ))
          )}

          <Pressable style={styles.requestButton} onPress={openPicker}>
            <Text style={styles.requestButtonText}>Request a new certificate</Text>
          </Pressable>
        </ScrollView>
      )}

      <Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={closePicker}>
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              {pickedType === null ? (
                <>
                  <Text style={styles.sheetTitle}>Choose a certificate</Text>
                  {DOCUMENT_TYPES.map((type) => (
                    <Pressable key={type} style={styles.typeRow} onPress={() => setPickedType(type)}>
                      <Text style={styles.typeRowText}>{docTypeLabel(type)}</Text>
                    </Pressable>
                  ))}
                  <Pressable style={styles.cancelButton} onPress={closePicker}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={styles.sheetTitle}>{docTypeLabel(pickedType)}</Text>
                  <Text style={styles.sheetSubtitle}>Tell us why you need this certificate</Text>
                  <TextInput
                    value={reason}
                    onChangeText={setReason}
                    placeholder="Reason"
                    placeholderTextColor={parentColors.mutedLight}
                    style={styles.reasonInput}
                    multiline
                  />
                  <Pressable
                    style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
                    disabled={!canSubmit || submitting}
                    onPress={submitRequest}
                  >
                    {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Submit request</Text>}
                  </Pressable>
                  <Pressable style={styles.cancelButton} onPress={() => setPickedType(null)}>
                    <Text style={styles.cancelButtonText}>Back</Text>
                  </Pressable>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={viewing !== null} animationType="slide" transparent onRequestClose={() => setViewing(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            {viewing ? (
              <>
                <View style={styles.viewTop}>
                  <Text style={styles.sheetTitle}>{docTypeLabel(viewing.docType)}</Text>
                  <View style={[styles.viewPill, { backgroundColor: docStateMeta(viewing.state).bg }]}>
                    <Text style={[styles.viewPillText, { color: docStateMeta(viewing.state).fg }]}>{docStateMeta(viewing.state).label}</Text>
                  </View>
                </View>
                <Text style={styles.viewLabel}>REQUESTED ON</Text>
                <Text style={styles.viewValue}>{formatDate(viewing.createdAt)}</Text>
                <Text style={styles.viewLabel}>REASON</Text>
                <Text style={styles.viewValue}>{viewing.reason}</Text>
                {viewing.decisionNote ? (
                  <>
                    <Text style={styles.viewLabel}>DECISION NOTE</Text>
                    <Text style={styles.viewValue}>{viewing.decisionNote}</Text>
                  </>
                ) : null}
                <Pressable style={styles.cancelButton} onPress={() => setViewing(null)}>
                  <Text style={styles.cancelButtonText}>Close</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function RequestCard({
  request,
  onView,
  onDownload,
  downloading,
}: {
  request: DocumentRequest;
  onView: () => void;
  onDownload: () => void;
  downloading: boolean;
}) {
  const meta = docStateMeta(request.state);
  const canDownload = request.state === 'APPROVED' && request.documentObjectKey !== null;
  return (
    <View style={[styles.card, cardShadow]}>
      <View style={styles.cardTop}>
        <View style={styles.iconBox}>
          <DocIcon />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.docName} numberOfLines={1}>
            {docTypeLabel(request.docType)}
          </Text>
          <Text style={styles.docMeta} numberOfLines={1}>
            {formatDate(request.createdAt)} · {request.reason}
          </Text>
        </View>
        <View style={[styles.statePill, { backgroundColor: meta.bg }]}>
          <Text style={[styles.statePillText, { color: meta.fg }]}>{meta.label}</Text>
        </View>
      </View>
      <View style={styles.actionsRow}>
        <Pressable style={styles.actionButton} onPress={onView}>
          <Text style={styles.actionButtonText}>View</Text>
        </Pressable>
        <Pressable
          style={[styles.actionButton, !canDownload && styles.actionButtonDisabled]}
          disabled={!canDownload || downloading}
          onPress={onDownload}
        >
          {downloading ? (
            <ActivityIndicator size="small" color={parentColors.blueDeep} />
          ) : (
            <Text style={[styles.actionButtonText, !canDownload && styles.actionButtonTextDisabled]}>Download</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  emptyText: { textAlign: 'center', fontSize: 13.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 8 },
  card: { backgroundColor: parentColors.white, borderWidth: 1, borderColor: parentColors.border, borderRadius: 16, paddingVertical: 15, paddingHorizontal: 16 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 40,
    height: 46,
    borderRadius: 8,
    backgroundColor: parentColors.dueBg,
    borderWidth: 1,
    borderColor: parentColors.coverBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docName: { fontSize: 15.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  docMeta: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 3 },
  statePill: { paddingVertical: 6, paddingHorizontal: 11, borderRadius: 99 },
  statePillText: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_700Bold' },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionButton: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: parentColors.border },
  actionButtonDisabled: { borderColor: parentColors.borderSoft, backgroundColor: parentColors.pillNeutralBg },
  actionButtonText: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.blueDeep },
  actionButtonTextDisabled: { color: parentColors.mutedLight },
  requestButton: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#A9C2F5',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  requestButtonText: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.blue },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '88%', backgroundColor: parentColors.white, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 24 },
  sheetTitle: { fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  sheetSubtitle: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.mutedSoft, marginTop: 4, marginBottom: 14 },
  typeRow: { paddingVertical: 14, borderTopWidth: 1, borderTopColor: parentColors.borderSoft },
  typeRowText: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  reasonInput: {
    borderWidth: 1,
    borderColor: parentColors.fieldBorder,
    borderRadius: 12,
    padding: 13,
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: parentColors.ink,
    minHeight: 96,
    textAlignVertical: 'top',
  },
  submitButton: { marginTop: 16, alignItems: 'center', paddingVertical: 14, borderRadius: 14, backgroundColor: parentColors.blue },
  submitButtonDisabled: { backgroundColor: parentColors.disabled },
  submitButtonText: { color: '#fff', fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold' },
  cancelButton: { marginTop: 10, alignItems: 'center', paddingVertical: 12 },
  cancelButtonText: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.mutedSoft },
  viewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  viewPill: { paddingVertical: 6, paddingHorizontal: 11, borderRadius: 99 },
  viewPillText: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_700Bold' },
  viewLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.muted, letterSpacing: 1, marginTop: 16 },
  viewValue: { fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', color: parentColors.bodyMuted, marginTop: 5, lineHeight: 20 },
});
