/**
 * lib/notification-routing.ts
 *
 * Single source of truth for notification → deep-link mapping.
 * Used by:
 *   - _layout.tsx  (push notification tap while app is backgrounded/closed)
 *   - notifications.tsx (in-app notification list tap)
 *
 * When a new detail screen is added (e.g. tasks/[id]), update ONLY this file.
 */

import type { NotifEntityType } from '@/lib/api/notifications';

/**
 * Returns the Expo Router path to push when a notification is tapped.
 *
 * @param entityType  - related_entity_type from the notification row / push data
 * @param entityId    - related_entity_id (UUID string) from the same source
 * @returns           - an absolute route string safe to pass to router.push()
 */
export function deepLinkForNotification(
  entityType: NotifEntityType | string | null | undefined,
  entityId:   string | null | undefined,
): string {
  switch (entityType) {
    case 'bill':
      // Navigate directly to the bill detail when we have the ID
      return entityId ? `/bills/${entityId}` : '/bills';

    case 'task':
      return entityId ? `/tasks/${entityId}` : '/tasks';

    case 'reading':
      return '/(tabs)/readings';

    case 'meter':
    case 'connection':
      return '/meters';

    default:
      return '/notifications';
  }
}
