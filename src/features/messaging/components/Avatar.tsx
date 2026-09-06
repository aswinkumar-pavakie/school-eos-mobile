import { StyleSheet, Text, View } from 'react-native';
import { accent, fonts } from '@/lib/theme';
import { initialOf } from '../utils';

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.letter, { fontSize: size * 0.4 }]}>{initialOf(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    backgroundColor: '#E4E9FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: { fontFamily: fonts.bold, color: accent.blue },
});
