// After a sign-in (or an account switch) the app must always open on Home, never
// on whichever feature screen the previous session was last showing. Pops any
// leftover screens first, then replaces with the protected Home route.

import type { useRouter } from 'expo-router';

type Router = ReturnType<typeof useRouter>;

export function goHome(router: Router): void {
  try {
    if (router.canDismiss()) router.dismissAll();
  } catch {
    // Nothing to pop -- fine, the replace below is what matters.
  }
  router.replace('/(protected)');
}
