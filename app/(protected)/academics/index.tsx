// Role-branched: Faculty gets their own real Academics hub (Current Term/
// Timetable/Calendar); Parent keeps the exact existing AcademicsHubScreen,
// untouched.

import { ActivityIndicator, View } from 'react-native';
import { useCurrentRoles } from '@/hooks/useCurrentRoles';
import { AcademicsHubScreen } from '@/features/academics/screens/AcademicsHubScreen';
import { FacultyAcademics } from '@/components/faculty/FacultyAcademics';
import { parentColors } from '@/lib/theme';

export default function AcademicsRoute() {
  const { isFaculty, isLoading } = useCurrentRoles();
  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: parentColors.background }}>
        <ActivityIndicator color={parentColors.blue} />
      </View>
    );
  }
  return isFaculty ? <FacultyAcademics /> : <AcademicsHubScreen />;
}
