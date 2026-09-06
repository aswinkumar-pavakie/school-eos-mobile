// Which of the parent's (possibly several) children the app is currently showing.
// Deliberately in-memory only (not persisted) -- a fresh app launch defaulting back
// to the first child is the safer, more predictable behaviour than silently
// restoring a stale selection from a previous session.

import { create } from 'zustand';

interface SelectedChildState {
  studentId: string | null;
  setStudentId: (studentId: string) => void;
}

export const useSelectedChildStore = create<SelectedChildState>((set) => ({
  studentId: null,
  setStudentId: (studentId) => set({ studentId }),
}));
