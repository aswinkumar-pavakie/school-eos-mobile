import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { CampusRequestBody, type CampusHistoryItem } from '@/components/faculty/CampusRequestBody';
import { listMedicalAppointments, createMedicalAppointment } from '@/lib/campus-api';
import { formatDate } from '@/lib/format';

export default function CampusMedicalScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['campus-medical-appointments'], queryFn: listMedicalAppointments });

  const history: CampusHistoryItem[] = (query.data ?? []).map((a) => ({
    id: a.id,
    title: a.reason,
    subtitle: `${formatDate(a.preferredDate)}${a.preferredTime ? ` · ${a.preferredTime}` : ''}`,
    status: a.status,
    createdAt: a.createdAt,
  }));

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Medical" subtitle="Book a medical appointment" onBack={() => router.replace('/faculty/campus-hub' as never)} />
      <CampusRequestBody
        applyTitle="Book an appointment"
        submitLabel="Submit request"
        emptyHistoryText="No appointments yet."
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        onRefresh={() => query.refetch()}
        history={history}
        fields={[
          { key: 'preferredDate', label: 'PREFERRED DATE', placeholder: 'YYYY-MM-DD' },
          { key: 'preferredTime', label: 'PREFERRED TIME', placeholder: 'e.g. 2:00 PM', required: false },
          { key: 'reason', label: 'REASON', placeholder: 'e.g. Fever, general checkup', multiline: true },
        ]}
        onSubmit={async (v) => {
          await createMedicalAppointment({ preferredDate: v.preferredDate ?? '', reason: v.reason ?? '', ...(v.preferredTime ? { preferredTime: v.preferredTime } : {}) });
          queryClient.invalidateQueries({ queryKey: ['campus-medical-appointments'] });
        }}
      />
    </View>
  );
}
