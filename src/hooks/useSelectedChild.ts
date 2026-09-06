// Resolves "which child is this parent currently looking at" for every screen that
// needs it (My class header, Fees). Real children list from the backend
// (guardian_link, ACTIVE only) -- defaults to the first one until the parent
// explicitly switches.

import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listChildren, type ParentChild } from '@/lib/parent-api';
import { useSelectedChildStore } from '@/store/selected-child.store';

export function useSelectedChild() {
  const childrenQuery = useQuery({ queryKey: ['parent-children'], queryFn: listChildren });
  const studentId = useSelectedChildStore((s) => s.studentId);
  const setStudentId = useSelectedChildStore((s) => s.setStudentId);

  const children = useMemo(() => childrenQuery.data ?? [], [childrenQuery.data]);

  useEffect(() => {
    if (!studentId && children.length > 0) {
      const first = children[0];
      if (first) setStudentId(first.studentId);
    }
  }, [studentId, children, setStudentId]);

  const selected = useMemo<ParentChild | null>(() => {
    if (!studentId) return null;
    return children.find((c) => c.studentId === studentId) ?? children[0] ?? null;
  }, [children, studentId]);

  return {
    children,
    selected,
    selectChild: setStudentId,
    isLoading: childrenQuery.isLoading,
    error: childrenQuery.error,
  };
}
