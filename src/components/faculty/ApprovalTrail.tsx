// Shared "approved/rejected by whom" trail display -- every Faculty request
// that goes through the generic approvals engine (HR Payroll, Payslip,
// Appraisal, Employee Leave & OD) renders its real decidedByName/role/
// comment the same way.

import { StyleSheet, Text, View } from 'react-native';
import { roleLabel, type ApprovalStepSummary } from '@/lib/faculty-approval-trail';
import { formatDate } from '@/lib/format';
import { facultyColors } from '@/lib/theme';

export function ApprovalTrail({ steps }: { steps: ApprovalStepSummary[] }) {
  const decided = steps.filter((s) => s.decision);
  if (decided.length === 0) return null;
  return (
    <View style={styles.box}>
      {decided.map((s, i) => (
        <View key={i} style={i > 0 ? styles.lineSpaced : undefined}>
          <Text style={styles.line}>
            <Text style={s.decision === 'APPROVED' ? styles.approved : styles.rejected}>{s.decision === 'APPROVED' ? 'Approved' : 'Rejected'}</Text>
            {' by '}
            <Text style={styles.name}>{s.decidedByName ?? roleLabel(s.approverRoleCode)}</Text>
            {` (${roleLabel(s.approverRoleCode)})`}
            {s.decidedAt ? ` · ${formatDate(s.decidedAt)}` : ''}
          </Text>
          {s.comment ? <Text style={styles.comment}>&ldquo;{s.comment}&rdquo;</Text> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginTop: 10, borderTopWidth: 1, borderTopColor: facultyColors.borderSoft, paddingTop: 9, gap: 6 },
  lineSpaced: { marginTop: 4 },
  line: { fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', color: facultyColors.bodyMuted },
  name: { fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.ink },
  approved: { fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.greenDark },
  rejected: { fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.redDark },
  comment: { fontSize: 11.5, color: facultyColors.muted, marginTop: 2, fontStyle: 'italic' },
});
