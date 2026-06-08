/**
 * ocr-meter Edge Function
 *
 * Čita stanje vodomjera sa fotografije koristeći rork toolkit LLM vision
 * endpoint (besplatan, bez API ključa).
 *
 * POST body:
 *  { imageBase64: string, mimeType?: string }
 *
 * Response (OCRResult):
 *  { readable: boolean, value: number | null, confidence: 'high'|'medium'|'low', error?: string }
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TOOLKIT_URL = Deno.env.get('EXPO_PUBLIC_TOOLKIT_URL') ?? 'https://toolkit.rork.com';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

const PROMPT =
  'Na slici je brojčanik vodomjera (mehanički ili digitalni). Pročitaj glavnu ' +
  'numeričku vrijednost stanja brojila (cijeli broj kubnih metara, ignoriši ' +
  'crvene decimalne cifre ako su jasno odvojene). Odgovori ISKLJUČIVO u JSON ' +
  'formatu bez dodatnog teksta: ' +
  '{"readable": boolean, "value": number|null, "confidence": "high"|"medium"|"low"}. ' +
  'Ako brojčanik nije čitljiv postavi readable=false i value=null.';

function parseModelJson(text: string): { readable: boolean; value: number | null; confidence: string } | null {
  if (!text) return null;
  // Izvuci prvi JSON objekt iz odgovora (model ponekad doda markdown ograde)
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { imageBase64, mimeType } = await req.json() as {
      imageBase64: string; mimeType?: string;
    };
    if (!imageBase64) {
      return json({ readable: false, value: null, confidence: 'low', error: 'imageBase64 je obavezan' }, 400);
    }

    const dataUrl = `data:${mimeType ?? 'image/jpeg'};base64,${imageBase64}`;

    const res = await fetch(new URL('/llm/text', TOOLKIT_URL).toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: PROMPT },
              { type: 'image', image: dataUrl },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error('[ocr-meter] toolkit error:', res.status, detail);
      return json({ readable: false, value: null, confidence: 'low', error: `OCR servis nedostupan (${res.status}).` }, 502);
    }

    const data = await res.json();
    const completion: string = data?.completion ?? '';
    const parsed = parseModelJson(completion);

    if (!parsed || parsed.value == null || isNaN(Number(parsed.value))) {
      return json({ readable: false, value: null, confidence: 'low' });
    }

    const conf = ['high', 'medium', 'low'].includes(parsed.confidence) ? parsed.confidence : 'medium';
    return json({
      readable: parsed.readable !== false,
      value: Number(parsed.value),
      confidence: conf,
    });

  } catch (err: any) {
    console.error('[ocr-meter] error:', err);
    return json({ readable: false, value: null, confidence: 'low', error: err?.message ?? 'Greška OCR-a' }, 500);
  }
});
