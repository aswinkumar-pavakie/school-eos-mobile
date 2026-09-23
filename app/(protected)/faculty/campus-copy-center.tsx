import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { CampusRequestBody, type CampusHistoryItem } from '@/components/faculty/CampusRequestBody';
import { listCopyCenterOrders, createCopyCenterOrder } from '@/lib/campus-api';
import { formatDate } from '@/lib/format';

export default function CampusCopyCenterScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['campus-copy-center-orders'], queryFn: listCopyCenterOrders });

  const history: CampusHistoryItem[] = (query.data ?? []).map((o) => ({
    id: o.id,
    title: o.description,
    subtitle: `${formatDate(o.createdAt)}${o.quantity ? ` · Qty ${o.quantity}` : ''}${o.neededBy ? ` · Needed by ${formatDate(o.neededBy)}` : ''}`,
    status: o.status,
    createdAt: o.createdAt,
  }));

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Copy Center" subtitle="Order stationery and printing" onBack={() => router.replace('/faculty/campus-hub' as never)} />
      <CampusRequestBody
        applyTitle="Place an order"
        submitLabel="Submit order"
        emptyHistoryText="No orders yet."
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        onRefresh={() => query.refetch()}
        history={history}
        fields={[
          { key: 'description', label: 'WHAT DO YOU NEED?', placeholder: 'e.g. Print 30 copies of worksheet, spiral bound', multiline: true },
          { key: 'quantity', label: 'QUANTITY', placeholder: 'e.g. 30', keyboardType: 'numeric', required: false },
          { key: 'neededBy', label: 'NEEDED BY', placeholder: 'YYYY-MM-DD', required: false },
        ]}
        onSubmit={async (v) => {
          await createCopyCenterOrder({
            description: v.description ?? '',
            ...(v.quantity ? { quantity: Number(v.quantity) } : {}),
            ...(v.neededBy ? { neededBy: v.neededBy } : {}),
          });
          queryClient.invalidateQueries({ queryKey: ['campus-copy-center-orders'] });
        }}
      />
    </View>
  );
}
