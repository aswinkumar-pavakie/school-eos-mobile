// "Switch account" sheet -- pressing the profile avatar on Home opens this.
//
//  * Faculty login: lists ONLY the class accounts already added on this phone (with their
//    email); each switches instantly, no password. Nothing about classes that are not
//    added is shown. The "Add account" button (email + password popup) is always here.
//  * Class Teacher login: offers the one way back (the Faculty account it was entered
//    from). Accounts are only ever ADDED from the Faculty login.
//
// The server decides what is allowed -- see src/lib/auth.ts (addClassAccount /
// switchLinkedAccount) and school-eos-website/rnd-linked-account-switching.md.

import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { facultyColors } from '@/lib/theme';
import { ApiError } from '@/lib/api';
import {
  fetchAvailableClassAccounts,
  getActiveClassName,
  getActiveIdentifier,
  getHomeAccount,
  switchLinkedAccount,
  type AvailableClassAccount,
  type HomeAccount,
  type IdentityLabel,
} from '@/lib/auth';
import { goHome } from '@/lib/go-home';
import { AddAccountModal } from './AddAccountModal';

export function AccountSwitcherModal({
  visible,
  onClose,
  activeLabel,
}: {
  visible: boolean;
  onClose: () => void;
  activeLabel: IdentityLabel | null;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [available, setAvailable] = useState<AvailableClassAccount[]>([]);
  const [home, setHome] = useState<HomeAccount | null>(null);
  const [activeClass, setActiveClass] = useState<string | null>(null);
  const [activeIdentifier, setActiveIdentifier] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const isFaculty = activeLabel === 'FACULTY';

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      const [homeAccount, className, identifier] = await Promise.all([
        getHomeAccount(),
        getActiveClassName(),
        getActiveIdentifier(),
      ]);
      let list: AvailableClassAccount[] = [];
      let loadError: string | null = null;
      if (isFaculty) {
        try {
          list = await fetchAvailableClassAccounts();
        } catch (err) {
          loadError = err instanceof ApiError ? err.message : 'Could not load your classes. Check your connection.';
        }
      }
      if (cancelled) return;
      setHome(homeAccount);
      setActiveClass(className);
      setActiveIdentifier(identifier);
      setAvailable(list);
      setError(loadError);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, isFaculty]);

  async function switchTo(personId: string, title: string) {
    if (busyId) return;
    setBusyId(personId);
    setError(null);
    try {
      await switchLinkedAccount(personId, title);
      queryClient.clear();
      onClose();
      goHome(router);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError('That account is no longer linked on this phone. Add it again from your Faculty login.');
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Could not switch. Check your connection and try again.');
      }
    } finally {
      setBusyId(null);
    }
  }

  function openAdd() {
    onClose();
    setShowAdd(true);
  }

  const activeTitle = isFaculty ? 'Faculty' : `Class Teacher${activeClass ? ` · ${activeClass}` : ''}`;
  const activeInitials = isFaculty ? 'FA' : (activeClass ?? 'CT').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 3);

  return (
    <>
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>Switch account</Text>

          <View style={styles.row}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{activeInitials}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.rowLabel} numberOfLines={1}>{activeTitle}</Text>
              <Text style={styles.rowMeta} numberOfLines={1}>{activeIdentifier || 'Signed in'}</Text>
            </View>
            <Ionicons name="checkmark-circle" size={22} color={facultyColors.blue} />
          </View>

          {loading ? <ActivityIndicator style={{ marginVertical: 14 }} color={facultyColors.blue} /> : null}

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Faculty: the classes the admin mapped to me */}
          {isFaculty &&
            available.map((c) => (
              <Pressable
                key={c.linkedPersonId}
                style={styles.row}
                disabled={busyId !== null}
                onPress={() => switchTo(c.linkedPersonId, c.label)}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{c.label.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 3)}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.rowLabel} numberOfLines={1}>Class Teacher · {c.label}</Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {c.email ?? c.emailHint ?? 'Added on this phone'}
                  </Text>
                </View>
                {busyId === c.linkedPersonId ? (
                  <ActivityIndicator color={facultyColors.blue} />
                ) : (
                  <Ionicons name="chevron-forward" size={20} color={facultyColors.muted} />
                )}
              </Pressable>
            ))}

          {isFaculty && !loading && !error && available.length === 0 ? (
            <Text style={styles.emptyNote}>
              Add your class teacher account to switch between your accounts.
            </Text>
          ) : null}

          {/* Class Teacher: the way back */}
          {!isFaculty && home ? (
            <Pressable style={styles.row} disabled={busyId !== null} onPress={() => switchTo(home.personId, home.title)}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>FA</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.rowLabel} numberOfLines={1}>{home.title}</Text>
                <Text style={styles.rowMeta} numberOfLines={1}>Switch back</Text>
              </View>
              {busyId === home.personId ? (
                <ActivityIndicator color={facultyColors.blue} />
              ) : (
                <Ionicons name="chevron-forward" size={20} color={facultyColors.muted} />
              )}
            </Pressable>
          ) : null}

          {isFaculty ? (
            <Pressable style={styles.addButton} onPress={() => openAdd()} disabled={busyId !== null}>
              <Ionicons name="add-circle-outline" size={20} color={facultyColors.blue} />
              <Text style={styles.addText}>Add account</Text>
            </Pressable>
          ) : (
            <Text style={styles.emptyNote}>Accounts are added from your Faculty login.</Text>
          )}

          <Pressable style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
    <AddAccountModal visible={showAdd} onClose={() => setShowAdd(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 10, paddingBottom: 28, paddingHorizontal: 18 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 14 },
  title: { fontSize: 13, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.muted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.blueDark },
  rowLabel: { fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.ink },
  rowMeta: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_500Medium', color: facultyColors.muted, marginTop: 2 },
  errorBox: { backgroundColor: '#FEE2E2', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, marginVertical: 8 },
  errorText: { fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', color: '#991B1B' },
  emptyNote: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_500Medium', color: facultyColors.muted, marginVertical: 10, lineHeight: 18 },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: facultyColors.blue },
  addText: { fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.blue },
  cancelButton: { marginTop: 10, paddingVertical: 14, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#EDF0F6' },
  cancelText: { fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.muted },
});
