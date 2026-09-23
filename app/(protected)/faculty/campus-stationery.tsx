import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { CampusRequestBody, type CampusHistoryItem } from '@/components/faculty/CampusRequestBody';
import { listStationeryOrders, createStationeryOrder } from '@/lib/campus-api';
import { formatDate } from '@/lib/format';

export default function CampusStationeryScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['campus-stationery-orders'], queryFn: listStationeryOrders });

  const history: CampusHistoryItem[] = (query.data ?? []).map((o) => ({
    id: o.id,
    title: o.items,
    subtitle: formatDate(o.createdAt),
    status: o.status,
    createdAt: o.createdAt,
  }));

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Stationery Store" subtitle="Notebooks & school essentials" onBack={() => router.replace('/faculty/campus-hub' as never)} />
      <CampusRequestBody
        applyTitle="Place an order"
        submitLabel="Submit order"
        emptyHistoryText="No orders yet."
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        onRefresh={() => query.refetch()}
        history={history}
        fields={[
          { key: 'items', label: 'ITEMS', placeholder: 'e.g. 5x notebooks, 2x marker sets', multiline: true },
          { key: 'notes', label: 'NOTES (OPTIONAL)', placeholder: 'e.g. Deliver to staff room', multiline: true, required: false },
        ]}
        onSubmit={async (v) => {
          await createStationeryOrder({ items: v.items ?? '', ...(v.notes ? { notes: v.notes } : {}) });
          queryClient.invalidateQueries({ queryKey: ['campus-stationery-orders'] });
        }}
      />
    </View>
  );
}
