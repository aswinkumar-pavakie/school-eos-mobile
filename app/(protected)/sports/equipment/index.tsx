// Sports Admin -> Equipment catalog. Real listEquipmentCatalog() +
// createEquipmentItem() -- same backend the website's Sports Admin console
// already uses.

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sportsColors } from '@/lib/theme';
import { Card, SportsSubHeader } from '@/components/sports/primitives';
import { RegisterList, type RegisterRow } from '@/components/sports/RegisterList';
import { createEquipmentItem, listEquipmentCatalog } from '@/lib/sports-api';

// Real equipment.condition enum (confirmed via create-equipment.dto.ts's
// own @IsIn list; live-tested via the real POST /equipment, which 400s on
// anything else -- a free-text field here would fail on every save).
const EQUIPMENT_CONDITIONS = ['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'];

export default function EquipmentScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [condition, setCondition] = useState<string | null>(null);

  const equipmentQuery = useQuery({ queryKey: ['sports-equipment'], queryFn: listEquipmentCatalog });

  const createMutation = useMutation({
    mutationFn: () => {
      const quantityTotal = Number(qty);
      if (!name.trim() || !Number.isFinite(quantityTotal) || quantityTotal <= 0) throw new Error('Enter a name and a valid quantity.');
      return createEquipmentItem({ name: name.trim(), quantityTotal, condition: condition ?? undefined });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sports-equipment'] });
      setShowAdd(false);
      setName('');
      setQty('');
      setCondition(null);
    },
  });

  const rows: RegisterRow[] = (equipmentQuery.data ?? [])
    .filter((e) => !search.trim() || e.name.toLowerCase().includes(search.trim().toLowerCase()))
    .map((e) => ({
      key: e.id,
      title: e.name,
      sub: e.condition ?? undefined,
      status: e.quantityAvailable > 0 ? 'active' : 'closed',
      metas: [
        { k: 'Available', v: `${e.quantityAvailable} / ${e.quantityTotal}` },
      ],
    }));

  return (
    <View style={{ flex: 1, backgroundColor: sportsColors.surface }}>
      <SportsSubHeader title="Equipment" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.addButton} onPress={() => setShowAdd((v) => !v)}>
          <Text style={styles.addButtonText}>{showAdd ? 'Close' : '+ New item'}</Text>
        </Pressable>
        {showAdd ? (
          <Card style={{ gap: 10 }}>
            <Text style={styles.label}>Name</Text>
            <TextInput value={name} onChangeText={setName} placeholder="Football (size 5)" placeholderTextColor={sportsColors.faint} style={styles.input} />
            <Text style={styles.label}>Quantity</Text>
            <TextInput value={qty} onChangeText={setQty} keyboardType="number-pad" placeholder="12" placeholderTextColor={sportsColors.faint} style={styles.input} />
            <Text style={styles.label}>Condition</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {EQUIPMENT_CONDITIONS.map((c) => (
                <Pressable key={c} onPress={() => setCondition(c)} style={[styles.chip, condition === c && styles.chipActive]}>
                  <Text style={[styles.chipText, condition === c && styles.chipTextActive]}>{c}</Text>
                </Pressable>
              ))}
            </View>
            {createMutation.isError ? <Text style={styles.error}>{(createMutation.error as Error).message}</Text> : null}
            <Pressable style={styles.saveButton} onPress={() => createMutation.mutate()}>
              <Text style={styles.addButtonText}>{createMutation.isPending ? 'Saving…' : 'Save item'}</Text>
            </Pressable>
          </Card>
        ) : null}
        <RegisterList
          title="Catalog"
          countLabel={`${equipmentQuery.data?.length ?? 0} items`}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search equipment"
          rows={rows}
          emptyLabel="No equipment in the catalog yet."
          refreshing={equipmentQuery.isFetching}
          onRefresh={() => equipmentQuery.refetch()}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
