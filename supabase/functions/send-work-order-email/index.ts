/**
 * send-work-order-email Edge Function
 *
 * Šalje radni nalog (BEZ cijena) korisniku priključka e-mailom (Resend).
 * Dozvoljeni: super_admin / utility_admin / finance (tenant-scoped).
 *
 * POST body: { task_id: string, recipient_email?: string }
 * Response:  { sent: true, email: string }
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const RESEND_URL = 'https://api.resend.com/emails';
const ALLOWED = new Set(['super_admin', 'utility_admin', 'finance']);

const TYPE_LABELS: Record<string, string> = {
  reading: 'Očitanje', maintenance: 'Radni nalog', inspection: 'Inspekcija',
  installation: 'Instalacija', other: 'Ostalo',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}
const fmtDate = (v?: string | null) => {
  if (!v) return '—';
  try { return new Date(v).toLocaleDateString('bs-BA'); } catch { return v; }
};

function buildHtml(task: any, materials: any[], services: any[], utilityName?: string | null): string {
  const idShort = String(task.id).substring(0, 8).toUpperCase();
  const matRows = materials.length
    ? materials.map((m) => `<tr><td>${m.name}</td><td style='text-align:right'>${m.quantity} ${m.unit}</td></tr>`).join('')
    : `<tr><td colspan='2' style='color:#999'>Nema unesenog materijala</td></tr>`;
  const svcRows = services.length
    ? services.map((s) => `<tr><td>${s.description}${s.provider ? ` (${s.provider})` : ''}</td>`
        + `<td style='text-align:center'>${s.is_external ? 'Eksterno' : 'Interno'}</td>`
        + `<td style='text-align:right'>${s.quantity} ${s.unit}</td></tr>`).join('')
    : `<tr><td colspan='3' style='color:#999'>Nema unesenih usluga</td></tr>`;

  return `<!DOCTYPE html><html><head><meta charset='utf-8'/>
<style>
  body{font-family:Arial,sans-serif;padding:24px;color:#333;font-size:13px;max-width:640px;margin:0 auto;}
  .header{display:flex;justify-content:space-between;border-bottom:2px solid #003366;padding-bottom:14px;margin-bottom:14px;}
  .co{font-weight:700;color:#003366;font-size:14px;}
  .no{font-size:20px;font-weight:800;color:#0ea5e9;}
  .sub{font-size:11px;color:#999;}
  .box{display:flex;justify-content:space-between;border:1px solid #eee;border-radius:6px;padding:12px;margin:12px 0;}
  .lbl{font-size:10px;color:#999;}
  .sec{background:#f0f7ff;padding:7px 12px;font-weight:700;color:#003366;margin:16px 0 6px;border-radius:3px;}
  table{width:100%;border-collapse:collapse;}
  th,td{padding:7px 10px;border-bottom:1px solid #f0f0f0;font-size:12px;}
  th{text-align:left;color:#666;background:#fafafa;}
  .note{border:1px solid #eee;border-radius:6px;padding:12px;color:#444;white-space:pre-wrap;}
</style></head><body>
<div class='header'>
  <div><div class='co'>${utilityName ?? 'JAVNO KOMUNALNO PREDUZEĆE'}</div><div class='sub'>AquaPulse platforma</div></div>
  <div style='text-align:right'><div class='sub'>RADNI NALOG</div><div class='no'>${idShort}</div></div>
</div>
<div class='box'>
  <div><div class='lbl'>Naslov</div><div><b>${task.title}</b></div><div class='sub'>${TYPE_LABELS[task.task_type] ?? task.task_type}</div></div>
  <div style='text-align:right'><div class='lbl'>Datum</div><div>${fmtDate(task.created_at)}</div>${task.due_date ? `<div class='sub'>Rok: ${fmtDate(task.due_date)}</div>` : ''}</div>
</div>
<div class='box'>
  <div><div class='lbl'>Adresa / Lokacija</div><div>${task.address ?? '—'}</div></div>
  <div style='text-align:right'><div class='lbl'>Vodomjer</div><div>${task.meter_serial ?? '—'}</div></div>
</div>
${task.description ? `<div class='sec'>Opis problema</div><div class='note'>${task.description}</div>` : ''}
<div class='sec'>Utrošeni materijal</div>
<table><thead><tr><th>Artikal</th><th style='text-align:right'>Količina</th></tr></thead><tbody>${matRows}</tbody></table>
<div class='sec'>Usluge / rad</div>
<table><thead><tr><th>Opis</th><th style='text-align:center'>Vrsta</th><th style='text-align:right'>Količina</th></tr></thead><tbody>${svcRows}</tbody></table>
${task.notes ? `<div class='sec'>Napomena</div><div class='note'>${task.notes}</div>` : ''}
<p class='sub' style='margin-top:24px'>Radni nalog je generisan elektronski putem AquaPulse platforme.</p>
</body></html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { autoRefreshToken: false, persistSession: false } });
    const caller = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });

    const { data: { user }, error: authErr } = await caller.auth.getUser();
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401);

    const { data: prof } = await admin.from('profiles').select('role, utility_id, is_active').eq('id', user.id).single();
    if (!prof || !prof.is_active) return json({ error: 'Account inactive' }, 403);
    if (!ALLOWED.has(prof.role)) return json({ error: 'Insufficient permissions' }, 403);

    const { task_id, recipient_email } = await req.json() as { task_id: string; recipient_email?: string };
    if (!task_id) return json({ error: 'task_id is required' }, 400);

    const { data: task, error: tErr } = await admin
      .from('tasks')
      .select('id, utility_id, title, task_type, description, notes, due_date, created_at, connection_id, connections(address, meter_serial, user_id), water_utilities:utility_id(name)')
      .eq('id', task_id)
      .single();
    if (tErr || !task) return json({ error: 'Task not found' }, 404);

    if (prof.role !== 'super_admin' && task.utility_id !== prof.utility_id) {
      return json({ error: 'Forbidden: task belongs to another utility' }, 403);
    }

    const conn = (task as any).connections;
    let toEmail = recipient_email?.trim() ?? '';
    if (!toEmail && conn?.user_id) {
      const { data: owner } = await admin.from('profiles').select('email').eq('id', conn.user_id).single();
      toEmail = owner?.email ?? '';
    }
    if (!toEmail) return json({ error: 'Nema e-mail adrese korisnika za ovaj nalog.' }, 400);

    const apiKey = Deno.env.get('RESEND_API_KEY');
    if (!apiKey) return json({ error: 'RESEND_API_KEY nije konfigurisan.' }, 500);
    const from = Deno.env.get('RESEND_FROM') ?? 'AquaPulse <onboarding@resend.dev>';

    const [{ data: materials }, { data: services }] = await Promise.all([
      admin.from('task_materials').select('name, unit, quantity').eq('task_id', task_id).order('created_at'),
      admin.from('task_services').select('description, is_external, provider, quantity, unit').eq('task_id', task_id).order('created_at'),
    ]);

    const html = buildHtml(
      { ...task, address: conn?.address, meter_serial: conn?.meter_serial },
      materials ?? [], services ?? [],
      (task as any).water_utilities?.name,
    );
    const idShort = String(task.id).substring(0, 8).toUpperCase();

    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [toEmail], subject: `Radni nalog ${idShort} — ${(task as any).water_utilities?.name ?? 'AquaPulse'}`, html }),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error('[send-work-order-email] Resend error:', res.status, detail);
      return json({ error: `Slanje e-maila nije uspjelo (${res.status}).` }, 502);
    }

    return json({ sent: true, email: toEmail });
  } catch (err: any) {
    console.error('[send-work-order-email] error:', err);
    return json({ error: err?.message ?? 'Internal server error' }, 500);
  }
});
