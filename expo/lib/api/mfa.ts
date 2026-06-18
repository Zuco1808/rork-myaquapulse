import { supabase } from '@/lib/supabase';

export interface MfaFactor {
  id: string;
  status: 'verified' | 'unverified';
  friendlyName?: string;
}

/** Vraća verifikovane TOTP faktore trenutnog korisnika. */
export const listVerifiedFactors = async (): Promise<MfaFactor[]> => {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  return (data?.totp ?? [])
    .filter((f: any) => f.status === 'verified')
    .map((f: any) => ({ id: f.id, status: f.status, friendlyName: f.friendly_name }));
};

/** Provjerava je li trenutni korisnik 2FA-enrolovan (ima verifikovan faktor). */
export const has2FA = async (): Promise<boolean> => {
  const factors = await listVerifiedFactors();
  return factors.length > 0;
};

export interface EnrollResult {
  factorId: string;
  qrSvg: string;   // SVG markup QR koda
  secret: string;  // ručni unos
  uri: string;     // otpauth://
}

/** Započinje enrollment — vraća QR/secret za authenticator app. */
export const enrollTotp = async (): Promise<EnrollResult> => {
  // Očisti eventualne ranije neverifikovane faktore (da enroll ne padne)
  try {
    const { data } = await supabase.auth.mfa.listFactors();
    for (const f of (data?.all ?? [])) {
      if (f.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
  } catch { /* ignore */ }

  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
  if (error) throw error;
  return {
    factorId: data.id,
    qrSvg: (data as any).totp.qr_code,
    secret: (data as any).totp.secret,
    uri: (data as any).totp.uri,
  };
};

/** Potvrđuje enrollment kodom iz authenticator app-a. */
export const verifyEnroll = async (factorId: string, code: string): Promise<void> => {
  const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
  if (chErr) throw chErr;
  const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: ch.id, code });
  if (error) throw error;
};

/** Isključuje 2FA (uklanja faktor). */
export const disableTotp = async (factorId: string): Promise<void> => {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw error;
};

/**
 * Nakon prijave lozinkom: treba li korisnik dovršiti 2FA izazov?
 * Vraća factorId ako je potrebno (aal1 → aal2), inače null.
 */
export const pendingMfaFactor = async (): Promise<string | null> => {
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === 'aal1' && aal?.nextLevel === 'aal2') {
    const factors = await listVerifiedFactors();
    return factors[0]?.id ?? null;
  }
  return null;
};

/** Dovršava prijavu kodom (challenge + verify → aal2). */
export const completeMfaChallenge = async (factorId: string, code: string): Promise<void> => {
  const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
  if (chErr) throw chErr;
  const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: ch.id, code });
  if (error) throw error;
};
