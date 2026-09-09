// Small shared inline icon set for the Faculty screens -- same hand-drawn-SVG
// convention events/index.tsx already uses (PlusIcon/TrashIcon there), just
// centralized here since so many Faculty screens need the same handful.

import Svg, { Path, Circle } from 'react-native-svg';

export function ChevronLeftIcon({ color = '#2563EB', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round">
      <Path d="M15 6l-6 6 6 6" />
    </Svg>
  );
}

export function ChevronRightIcon({ color = '#2563EB', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round">
      <Path d="M9 6l6 6-6 6" />
    </Svg>
  );
}

export function PlusIcon({ color = '#fff', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function TrashIcon({ color = '#B91C1C', size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round">
      <Path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
    </Svg>
  );
}

export function EditIcon({ color = '#2563EB', size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 20h4L18 6l-4-4L4 16v4z" />
    </Svg>
  );
}

export function SearchIcon({ color = '#94A3B8', size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
      <Circle cx={11} cy={11} r={7} />
      <Path d="M20 20l-4-4" />
    </Svg>
  );
}

export function CloseIcon({ color = '#94A3B8', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round">
      <Path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

export function CheckCircleIcon({ color = '#16A34A', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={9} />
      <Path d="M8 12.5l2.5 2.5L16 9.5" />
    </Svg>
  );
}

export function CancelCircleIcon({ color = '#DC2626', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
      <Circle cx={12} cy={12} r={9} />
      <Path d="M9.5 9.5l5 5M14.5 9.5l-5 5" />
    </Svg>
  );
}

export function ClockIcon({ color = '#F59E0B', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 7v5l3.5 2" />
    </Svg>
  );
}

export function HistoryIcon({ color = '#64748B', size = 17 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 4v5h5M4.5 13a8 8 0 1 0 2-8.6L4 9" />
      <Path d="M12 8v5l3 2" />
    </Svg>
  );
}

export function AttachIcon({ color = '#94A3B8', size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M17 8l-7.5 7.5a3 3 0 1 1-4.2-4.2L14 3a2 2 0 1 1 2.8 2.8L8.6 13.9a1 1 0 1 1-1.4-1.4L14 6" />
    </Svg>
  );
}

export function DateRangeIcon({ color = '#94A3B8', size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round">
      <Path d="M3 9h18M7 3v4M17 3v4M4 6h16v14H4z" />
    </Svg>
  );
}

export function ChevronDownIcon({ color = '#C0C8D6', size = 19 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round">
      <Path d="M6 9l6 6 6-6" />
    </Svg>
  );
}

export function DoneAllIcon({ color = '#2563EB', size = 17 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M2 12.5l3.5 3.5L13 8.5M8.5 16l.5.5L17 8" />
    </Svg>
  );
}

export function FolderIcon({ color = '#2563EB', size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 6.5a1.5 1.5 0 0 1 1.5-1.5h4l2 2h9a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z" />
    </Svg>
  );
}

export function FileIcon({ color = '#64748B', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <Path d="M14 3v4h4" />
    </Svg>
  );
}

export function UploadIcon({ color = '#fff', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 16V4M8 8l4-4 4 4" />
      <Path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
    </Svg>
  );
}
