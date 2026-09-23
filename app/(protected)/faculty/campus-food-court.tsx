import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { CampusRequestBody, type CampusHistoryItem } from '@/components/faculty/CampusRequestBody';
import { listFoodOrders, createFoodOrder } from '@/lib/campus-api';
import { formatDate } from '@/lib/format';

export default function CampusFoodCourtScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['campus-food-orders'], queryFn: listFoodOrders });

  const history: CampusHistoryItem[] = (query.data ?? []).map((o) => ({
    id: o.id,
    title: o.items,
    subtitle: `${formatDate(o.createdAt)}${o.pickupTime ? ` · Pickup ${o.pickupTime}` : ''}`,
    status: o.status,
    createdAt: o.createdAt,
  }));

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Food Court" subtitle="Order food from the campus canteen" onBack={() => router.replace('/faculty/campus-hub' as never)} />
      <CampusRequestBody
        applyTitle="Place an order"
        submitLabel="Submit order"
        emptyHistoryText="No orders yet."
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        onRefresh={() => query.refetch()}
        history={history}
        fields={[
          { key: 'items', label: 'ITEMS', placeholder: 'e.g. 2x Veg Sandwich, 1x Coffee', multiline: true },
          { key: 'pickupTime', label: 'PICKUP TIME', placeholder: 'e.g. 12:30 PM', required: false },
          { key: 'notes', label: 'NOTES (OPTIONAL)', placeholder: 'e.g. No onions', multiline: true, required: false },
        ]}
        onSubmit={async (v) => {
          await createFoodOrder({ items: v.items ?? '', ...(v.pickupTime ? { pickupTime: v.pickupTime } : {}), ...(v.notes ? { notes: v.notes } : {}) });
          queryClient.invalidateQueries({ queryKey: ['campus-food-orders'] });
        }}
      />
    </View>
  );
}
