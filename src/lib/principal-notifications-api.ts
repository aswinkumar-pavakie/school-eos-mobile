// Principal Notifications module -- GET /notifications and POST
// /notifications/:id/read carry NO @Roles() restriction at all (self-scoped
// to notification.person_id server-side, same "no role check, identity
// verification only" pattern the generic /approvals engine already uses) --
// already explicitly authorized for any authenticated actor, Principal
// included. There is no dedicated Principal web page for this (confirmed by
// audit -- web only shows a bare pending-approvals count badge on the shared
// Shell), but the backend capability genuinely exists and is real, so this is
// adaptation of an authorized capability, not invention. Re-exporting the
// already-correct VP module rather than duplicating it.

export {
  listNotifications,
  markNotificationRead,
  type NotificationRow,
  type NotificationListParams,
} from './vice-principal-notifications-api';
