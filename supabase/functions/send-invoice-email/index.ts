/**
 * send-invoice-email Edge Function
 *
 * Šalje fakturu (HTML račun) krajnjem korisniku putem Resend API-ja i
 * postavlja invoice.status = 'sent'.
 *
 * Sigurnost:
 *  - Samo super_admin / utility_admin / finance smiju slati
 *  - Tenant scoping: utility_admin i finance mogu slati samo fakture
 *    vlastite utility (server-side provjera)
 *  - Resend API ključ nikad ne napušta server
 *
 * POST body:
 *  {
 *    invoice_id:       string   (required)
 *    recipient_email?: string   (override; default = email vlasnika priključka)
 *  }
 *
 * Env (Supabase secrets):
 *  RESEND_API_KEY   — obavezno
 *  RESEND_FROM      — opcionalno, default 'AquaPulse <onboarding@resend.dev>'
 *
 * Response: { sent: true, email: string }
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const RESEND_URL = 'https://api.resend.com/emails';
const ALLOWED_ROLES = new Set(['super_admin', 'utility_admin', 'finance']);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

const fmtDate = (v: string | null): string => {
  if (!v) return '—';
  try { return new Date(v).toLocaleDateString('bs-BA'); } catch { return v; }
};

const fmtPeriod = (from: string, to: string): string =>
  `${fmtDate(from)} – ${fmtDate(to)}`;

function buildInvoiceHtml(bill: any): string {
  const amount = Number(bill.amount_bam ?? 0);
  const idShort = String(bill.id).substring(0, 8).toUpperCase();
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  body{font-family:Arial,sans-serif;padding:24px;color:#333;font-size:13px;max-width:640px;margin:0 auto;}
  .header{display:flex;justify-content:space-between;border-bottom:2px solid #003366;padding-bottom:14px;margin-bottom:14px;}
  .co{font-weight:700;color:#003366;font-size:14px;line-height:1.5;}
  .bill-no{font-size:20px;font-weight:800;color:#0ea5e9;}
  .sub{font-size:11px;color:#999;}
  .cbox{display:flex;justify-content:space-between;border:1px solid #eee;border-radius:6px;padding:12px;margin:12px 0;}
  .lbl{font-size:10px;color:#999;margin-bottom:2px;}
  .sec{background:#f0f7ff;padding:7px 12px;font-weight:700;color:#003366;margin:14px 0 2px;border-radius:3px;}
  .row{display:flex;justify-content:space-between;padding:7px 12px;border-bottom:1px solid #f0f0f0;}
  .rl{color:#666;}
  .total{display:flex;justify-content:space-between;padding:12px;background:#f0f7ff;font-size:15px;font-weight:700;border-radius:3px;margin-top:2px;}
  .tv{color:#0ea5e9;}
  .footer{margin-top:28px;text-align:center;font-size:10px;color:#aaa;line-height:1.6;}
</style></head><body>
<div class="header">
  <div><div class="co">${bill.utilityName ?? 'JAVNO KOMUNALNO PREDUZEĆE'}</div>${bill.utilityCity ? `<div class="sub">${bill.utilityCity}</div>` : ''}<div class="sub">AquaPulse platforma</div></div>
  <div style="text-align:right"><div class="sub">RAČUN</div><div class="bill-no">${idShort}</div><div class="sub">za utrošenu vodu</div></div>
</div>
<div class="cbox">
  <div><div class="lbl">Korisnik / Adresa</div><div>${bill.customerName ?? ''}${bill.address ? `<br/>${bill.address}` : ''}</div></div>
  <div style="text-align:right"><div class="lbl">Vodomjer</div><div>${bill.meterSerial || '—'}</div></div>
</div>
<div class="sec">Podaci o obračunu</div>
<div class="row"><span class="rl">Period</span><span>${fmtPeriod(bill.period_from, bill.period_to)}</span></div>
${bill.consumption_m3 != null ? `<div class="row"><span class="rl">Potrošnja (m³)</span><span>${bill.consumption_m3}</span></div>` : ''}
<div class="sec">Obračun</div>
<div class="row"><span class="rl">Usluga vodovoda</span><span>${(amount * 0.85).toFixed(2)} BAM</span></div>
<div class="row"><span class="rl">PDV (17%)</span><span>${(amount * 0.15).toFixed(2)} BAM</span></div>
<div class="total"><span>UKUPNO (s PDV)</span><span class="tv">${amount.toFixed(2)} BAM</span></div>
<div class="sec" style="margin-top:18px">UPLATNI NALOG</div>
<div class="row"><span class="rl">Iznos</span><span><strong>${amount.toFixed(2)} BAM</strong></span></div>
<div class="row"><span class="rl">Rok plaćanja</span><span>${fmtDate(bill.due_date)}</span></div>
<div class="footer">Račun je generisan elektronski putem AquaPulse platforme i punovažan je bez potpisa.</div>
</body></html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

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

    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role, utility_id, is_active')
      .eq('id', caller.id)
      .single();

    if (!callerProfile || !callerProfile.is_active) return json({ error: 'Account inactive' }, 403);
    if (!ALLOWED_ROLES.has(callerProfile.role)) return json({ error: 'Insufficient permissions' }, 403);

    /* ── 2. Body ── */
    const { invoice_id, recipient_email } = await req.json() as {
      invoice_id: string; recipient_email?: string;
    };
    if (!invoice_id) return json({ error: 'invoice_id is required' }, 400);

    /* ── 3. Fetch invoice + joins ── */
    const { data: inv, error: invErr } = await adminClient
      .from('invoices')
      .select(`
        id, utility_id, status, period_from, period_to, consumption_m3,
        amount_bam, due_date,
        connections ( meter_serial, address, user_id ),
        water_utilities ( name, city, email, support_email )
      `)
      .eq('id', invoice_id)
      .single();

    if (invErr || !inv) return json({ error: 'Invoice not found' }, 404);

    /* ── 4. Tenant scope ── */
    if (callerProfile.role !== 'super_admin' && inv.utility_id !== callerProfile.utility_id) {
      return json({ error: 'Forbidden: invoice belongs to another utility' }, 403);
    }

    /* ── 5. Recipient email ── */
    const conn = (inv as any).connections;
    let customerName = '';
    let toEmail = recipient_email?.trim() ?? '';
    if (!toEmail && conn?.user_id) {
      const { data: owner } = await adminClient
        .from('profiles')
        .select('email, full_name')
        .eq('id', conn.user_id)
        .single();
      toEmail = owner?.email ?? '';
      customerName = owner?.full_name ?? '';
    }
    if (!toEmail) {
      return json({ error: 'Nema e-mail adrese primaoca (priključak nema vlasnika s e-mailom).' }, 400);
    }

    /* ── 6. Resend config ── */
    const apiKey = Deno.env.get('RESEND_API_KEY');
    if (!apiKey) return json({ error: 'RESEND_API_KEY nije konfigurisan na serveru.' }, 500);
    const from = Deno.env.get('RESEND_FROM') ?? 'AquaPulse <onboarding@resend.dev>';

    const util = (inv as any).water_utilities;
    const html = buildInvoiceHtml({
      ...inv,
      utilityName:  util?.name ?? null,
      utilityCity:  util?.city ?? null,
      meterSerial:  conn?.meter_serial ?? '',
      address:      conn?.address ?? '',
      customerName,
    });
    const idShort = String(inv.id).substring(0, 8).toUpperCase();
    const replyTo = util?.support_email || util?.email || undefined;

    /* ── 7. Send via Resend ── */
    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [toEmail],
        ...(replyTo ? { reply_to: replyTo } : {}),
        subject: `Račun za vodu ${idShort} — ${util?.name ?? 'AquaPulse'}`,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[send-invoice-email] Resend error:', res.status, errText);
      return json({ error: `Slanje e-maila nije uspjelo (${res.status}).`, detail: errText }, 502);
    }

    /* ── 8. Mark sent (ako je draft/pending) ── */
    if (['draft', 'pending'].includes(inv.status)) {
      await adminClient.from('invoices').update({ status: 'sent' }).eq('id', inv.id);
    }

    return json({ sent: true, email: toEmail });

  } catch (err: any) {
    console.error('[send-invoice-email] Unexpected error:', err);
    return json({ error: err?.message ?? 'Internal server error' }, 500);
  }
});
