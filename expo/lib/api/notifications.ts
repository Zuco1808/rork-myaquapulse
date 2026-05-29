import { supabase } from '@/lib/supabase';

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

const sendExpoPush = async (token: string, payload: PushPayload) => {
  if (!token.startsWith('ExponentPushToken')) return;
  await fetch(EXPO_PUSH_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      to: token,
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
      sound: 'default',
      priority: 'high',
    }),
  }).catch(() => {});
};

const saveInAppNotification = async (
  userId: string,
  title: string,
  message: string,
) => {
  await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      title,
      message,
      type: 'warning',
      is_read: false,
      related_entity_type: 'bill',
      created_at: new Date().toISOString(),
    })
    .catch(() => {}); // Ignore if table doesn't exist yet
};

export const sendOverdueBillReminders = async (): Promise<{
  usersNotified: number;
  billsCount: number;
}> => {
  const { data, error } = await supabase
    .from('bills')
    .select('id, amount, due_date, user_id, profiles(name, push_token)')
    .eq('status', 'overdue');

  if (error) throw error;
  if (!data || data.length === 0) return { usersNotified: 0, billsCount: 0 };

  // Group bills by user
  const byUser = new Map<string, { name: string; pushToken: string | null; bills: any[] }>();
  for (const bill of data) {
    const profile = (bill as any).profiles;
    const uid: string = (bill as any).user_id;
    if (!byUser.has(uid)) {
      byUser.set(uid, {
        name: profile?.name || 'Korisnik',
        pushToken: profile?.push_token || null,
        bills: [],
      });
    }
    byUser.get(uid)!.bills.push(bill);
  }

  let usersNotified = 0;

  for (const [userId, info] of byUser) {
    const count = info.bills.length;
    const total = info.bills.reduce((s: number, b: any) => s + (b.amount || 0), 0);
    const suffix = count === 1 ? 'i račun' : count < 5 ? 'a računa' : ' računa';

    const title = 'Podsjetnik za plaćanje';
    const body =
      `Poštovani ${info.name}, imate ${count} neplaćen${suffix} ` +
      `ukupno ${total.toFixed(2)} KM. Molimo izmirit${count === 1 ? 'e' : 'e'} dugovanje.`;

    await saveInAppNotification(userId, title, body);

    if (info.pushToken) {
      await sendExpoPush(info.pushToken, {
        title,
        body,
        data: { type: 'bill_reminder', userId },
      });
    }

    usersNotified++;
  }

  return { usersNotified, billsCount: data.length };
};

export const getOverdueBillsCount = async (): Promise<number> => {
  const { count, error } = await supabase
    .from('bills')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'overdue');

  if (error) return 0;
  return count ?? 0;
};
