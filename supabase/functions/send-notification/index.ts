/**
 * send-notification Edge Function
 *
 * Sigurno šalje in-app + push notifikacije targetiranim korisnicima.
 *
 * Prednosti nad klijentskim rješenjem:
 *  - Push tokeni NIKAD ne napuštaju server
 *  - Tenant scoping je server-side (utility_admin ne može targetirati drugu utility)
 *  - Expo HTTP poziv je pouzdan (nije vezan za životni ciklus app-a)
 *  - Permisije se provjeravaju server-side
 *
 * POST body:
 *  {
 *    title:                string          (required)
 *    message:              string          (required)
 *    type:                 'info'|'warning'|'error'|'success'
 *    targetAll?:           boolean         (default false)
 *    targetRoles?:         string[]        (npr. ['worker', 'end_user'])
 *    utility_id?:          string | null
 *    related_entity_id?:   string
 *    related_entity_type?: string
 *  }
 *
 * Response: { sent: number }
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/* ── constants ────────────────────────────────────────────────────────────── */

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE    = 100;

/* ── helpers ──────────────────────────────────────────────────────────────── */

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

/** Sends Expo push messages in batches of 100. Fire-and-forget — errors are logged. */
async function sendExpoPushBatch(messages: object[]): Promise<void> {
  const valid = messages.filter((m: any) =>
    typeof m.to === 'string' && m.to.startsWith('ExponentPushToken['),
  );
  if (!valid.length) return;

  for (let i = 0; i < valid.length; i += BATCH_SIZE) {
    const batch = valid.slice(i, i + BATCH_SIZE);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(batch),
      });
      if (!res.ok) {
        console.warn('[send-notification] Expo batch failed:', res.status, await res.text());
      }
    } catch (err) {
      console.warn('[send-notification] Expo batch error:', err);
    }
  }
}

/* ── roles that may call this function ────────────────────────────────────── */
const ALLOWED_ROLES = new Set(['super_admin', 'utility_admin']);

/* ── main handler ─────────────────────────────────────────────────────────── */

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    /* ── 1. Auth ── */
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user: caller }, error: authErr } = await callerClient.auth.getUser();
    if (authErr || !caller) return json({ error: 'Unauthorized' }, 401);

    /* ── 2. Load caller profile ── */
    const { data: callerProfile, error: profileErr } = await adminClient
      .from('profiles')
      .select('role, utility_id, is_active')
      .eq('id', caller.id)
      .single();

    if (profileErr || !callerProfile) return json({ error: 'Profile not found' }, 403);
    if (!callerProfile.is_active)     return json({ error: 'Account deactivated' }, 403);
    if (!ALLOWED_ROLES.has(callerProfile.role)) {
      return json({ error: 'Insufficient permissions' }, 403);
    }

    /* ── 3. Parse & validate body ── */
    const body = await req.json();
    const {
      title,
      message,
      type            = 'info',
      targetAll       = false,
      targetRoles,
      utility_id,
      related_entity_id,
      related_entity_type,
    } = body as {
      title:                string;
      message:              string;
      type?:                string;
      targetAll?:           boolean;
      targetRoles?:         string[];
      utility_id?:          string | null;
      related_entity_id?:   string;
      related_entity_type?: string;
    };

    if (!title?.trim() || !message?.trim()) {
      return json({ error: 'title and message are required' }, 400);
    }

    /* ── 4. Tenant scope enforcement ── */
    // utility_admin can only send within their own utility — ignore whatever utility_id the client sends
    const effectiveUtilityId: string | null =
      callerProfile.role === 'utility_admin'
        ? callerProfile.utility_id          // always forced to own utility
        : (utility_id ?? null);             // super_admin can target any (or all)

    /* ── 5. Query target profiles (push_token stays server-side) ── */
    let query = adminClient
      .from('profiles')
      .select('id, push_token')
      .eq('is_active', true);

    if (!targetAll && Array.isArray(targetRoles) && targetRoles.length > 0) {
      query = query.in('role', targetRoles);
    }
    if (effectiveUtilityId) {
      query = query.eq('utility_id', effectiveUtilityId);
    }

    const { data: targets, error: targetsErr } = await query;
    if (targetsErr) return json({ error: targetsErr.message }, 500);
    if (!targets || targets.length === 0) return json({ sent: 0 });

    /* ── 6. Insert notification rows ── */
    const rows = targets.map((t: any) => ({
      user_id:             t.id,
      utility_id:          effectiveUtilityId,
      title:               title.trim(),
      message:             message.trim(),
      type,
      is_read:             false,
      related_entity_id:   related_entity_id   ?? null,
      related_entity_type: related_entity_type ?? null,
      created_by:          caller.id,
    }));

    const { error: insertErr } = await adminClient.from('notifications').insert(rows);
    if (insertErr) return json({ error: insertErr.message }, 500);

    /* ── 7. Send Expo push (fire-and-forget) ── */
    const pushMessages = targets
      .filter((t: any) => t.push_token)
      .map((t: any) => ({
        to:    t.push_token as string,
        title: title.trim(),
        body:  message.trim(),
        sound: 'default',
        data: {
          type,
          related_entity_id:   related_entity_id   ?? null,
          related_entity_type: related_entity_type ?? null,
        },
      }));

    // Don't await — response goes back to caller immediately
    sendExpoPushBatch(pushMessages).catch((err) =>
      console.error('[send-notification] Push delivery error:', err),
    );

    return json({ sent: rows.length });

  } catch (err: any) {
    console.error('[send-notification] Unexpected error:', err);
    return json({ error: err?.message ?? 'Internal server error' }, 500);
  }
});
