// "New Message" -- Principal picks who to start a conversation with. The only
// compose entry point in this app so far (Parent/Faculty conversations are all
// lazily auto-created, never explicitly started by a user action).

import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { PrincipalHeader } from '@/components/principal/PrincipalHeader';
import { ServiceIcon } from '@/components/ServiceIcon';
import { principalColors, cardShadow } from '@/lib/theme';

export default function NewMessageScreen() {
  const router = useRouter();

  return (
    <View style={styles.flex}>
      <PrincipalHeader title="New Message" subtitle="Who do you want to message?" onBack={() => router.back()} />
      <View style={styles.content}>
        <Pressable
          style={[styles.card, cardShadow]}
          onPress={() => router.push('/(protected)/principal/new-message/faculty' as never)}
        >
          <View style={styles.iconCircle}>
            <ServiceIcon name="classTeacher" color="#fff" />
          </View>
          <Text style={styles.cardTitle}>Faculty</Text>
          <Text style={styles.cardSubtitle}>Message any faculty member</Text>
        </Pressable>

        <Pressable
          style={[styles.card, cardShadow]}
          onPress={() => router.push('/(protected)/principal/new-message/student' as never)}
        >
          <View style={styles.iconCircle}>
            <ServiceIcon name="report" color="#fff" />
          </View>
          <Text style={styles.cardTitle}>Student</Text>
          <Text style={styles.cardSubtitle}>Message a student&apos;s family</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: principalColors.background },
  content: { padding: 18, gap: 14 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    alignItems: 'flex-start',
    gap: 6,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: principalColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  cardTitle: { fontSize: 16.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: principalColors.ink },
  cardSubtitle: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: principalColors.muted },
});
