// Shared inline icon set for the Principal module -- same hand-drawn-SVG
// convention src/components/faculty/icons.tsx already established (simple
// line icons, color/size props), pixel-matched in spirit to the design's own
// Material Symbols Rounded set (this app has no Material Symbols font
// bundled, so these are bespoke line-icon equivalents, not literal glyphs).

import Svg, { Path, Circle, Rect } from 'react-native-svg';

type IconProps = { color?: string; size?: number };

export function BellIcon({ color = '#fff', size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <Path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </Svg>
  );
}

export function ChevronRightIcon({ color = '#8A97B1', size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 6l6 6-6 6" />
    </Svg>
  );
}

export function ChevronLeftIcon({ color = '#8A97B1', size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 6l-6 6 6 6" />
    </Svg>
  );
}

export function PeopleIcon({ color = '#fff', size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={9} cy={8} r={3} />
      <Path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6" />
      <Path d="M15 8.2a2.6 2.6 0 1 1 3 2.6" />
      <Path d="M16 14.3c2.3.4 4 2.3 4 5.7" />
    </Svg>
  );
}

export function TeacherIcon({ color = '#fff', size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 9l9-4 9 4-9 4-9-4z" />
      <Path d="M7 11v5c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5v-5" />
      <Path d="M21 9v6" />
    </Svg>
  );
}

export function AttendanceIcon({ color = '#fff', size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={4} y={5} width={16} height={15} rx={2} />
      <Path d="M8 3v4M16 3v4M4 10h16" />
      <Path d="M8.5 14.5l2 2 4-4.5" />
    </Svg>
  );
}

export function AcademicCapIcon({ color = '#fff', size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M2 9l10-4 10 4-10 4-10-4z" />
      <Path d="M6 11v4.5c0 1.7 2.7 3 6 3s6-1.3 6-3V11" />
    </Svg>
  );
}

export function TimetableIcon({ color = '#fff', size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={4} y={4} width={16} height={16} rx={2} />
      <Path d="M4 9h16M9 4v16" />
    </Svg>
  );
}

export function CalendarIcon({ color = '#fff', size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={4} y={5} width={16} height={15} rx={2} />
      <Path d="M8 3v4M16 3v4M4 10h16" />
    </Svg>
  );
}

export function SubjectIcon({ color = '#fff', size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 4h11a2 2 0 0 1 2 2v14l-7.5-3L5 20V4z" />
    </Svg>
  );
}

export function BusIcon({ color = '#fff', size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3} y={5} width={18} height={11} rx={2} />
      <Path d="M3 11h18" />
      <Circle cx={7.5} cy={18.5} r={1.5} />
      <Circle cx={16.5} cy={18.5} r={1.5} />
    </Svg>
  );
}

export function HostelIcon({ color = '#fff', size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 20V9l9-6 9 6v11" />
      <Path d="M8 20v-6h8v6" />
    </Svg>
  );
}

export function LibraryIcon({ color = '#fff', size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5v-13z" />
      <Path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H13v16h5.5c.8 0 1.5-.7 1.5-1.5v-13z" />
    </Svg>
  );
}

export function SportsIcon({ color = '#fff', size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M7 4h10v4a5 5 0 0 1-10 0V4z" />
      <Path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3" />
      <Path d="M12 13v3M9 20h6M10 20v-2.5M14 20v-2.5" />
    </Svg>
  );
}

export function RepairIcon({ color = '#fff', size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M14.5 6.5a3.5 3.5 0 0 1-4.6 4.6L4 17v3h3l5.9-5.9a3.5 3.5 0 0 1 4.6-4.6L14 12l-1.5-1.5 3.5-3.5z" />
    </Svg>
  );
}

export function ApprovalIcon({ color = '#fff', size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={4} y={4} width={16} height={16} rx={3} />
      <Path d="M8 12.5l2.5 2.5L16 9" />
    </Svg>
  );
}

export function NoticeIcon({ color = '#fff', size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 10a2 2 0 0 1 2-2h1l9-4v14l-9-4H6a2 2 0 0 1-2-2v-2z" />
      <Path d="M8 15v3a1.5 1.5 0 0 0 3 0v-2" />
    </Svg>
  );
}

export function ChatIcon({ color = '#fff', size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 5h16v11H8l-4 4V5z" />
    </Svg>
  );
}

export function LeaveIcon({ color = '#fff', size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={4} y={5} width={16} height={15} rx={2} />
      <Path d="M8 3v4M16 3v4M4 10h16" />
      <Path d="M9.5 14l4 4M13.5 14l-4 4" />
    </Svg>
  );
}

export function ODIcon({ color = '#fff', size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3} y={7} width={18} height={12} rx={2} />
      <Path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7" />
      <Path d="M21 13h-5v2H8v-2H3" />
    </Svg>
  );
}

export function HRIcon({ color = '#fff', size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3} y={7} width={18} height={12} rx={2} />
      <Path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7" />
    </Svg>
  );
}

export function PayslipIcon({ color = '#fff', size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 3h12v18l-2.5-1.5L13 21l-1-1.5L11 21l-2.5-1.5L6 21V3z" />
      <Path d="M9 8h6M9 12h6M9 16h3" />
    </Svg>
  );
}

export function AppraisalIcon({ color = '#fff', size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3.5l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8L12 3.5z" />
    </Svg>
  );
}

export function ArrowCircleRightIcon({ color = '#fff', size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={9} />
      <Path d="M10 8.5l3.5 3.5-3.5 3.5" />
    </Svg>
  );
}

export function CheckCircleIcon({ color = '#18794E', size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={9} />
      <Path d="M8 12.5l2.5 2.5L16 9.5" />
    </Svg>
  );
}

export function CancelCircleIcon({ color = '#C2400F', size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
      <Circle cx={12} cy={12} r={9} />
      <Path d="M9.5 9.5l5 5M14.5 9.5l-5 5" />
    </Svg>
  );
}

export function SearchIcon({ color = '#8A97B1', size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
      <Circle cx={11} cy={11} r={7} />
      <Path d="M20 20l-4-4" />
    </Svg>
  );
}

export function ChevronDownIcon({ color = '#8A97B1', size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round">
      <Path d="M6 9l6 6 6-6" />
    </Svg>
  );
}

export function PlusIcon({ color = '#fff', size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function CloseIcon({ color = '#8A97B1', size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round">
      <Path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}
