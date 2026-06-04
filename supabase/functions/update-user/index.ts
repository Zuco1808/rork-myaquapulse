import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: caller }, error: authError } = await callerClient.auth.getUser();
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role, utility_id, distributor_id')
      .eq('id', caller.id)
      .single();

    if (!callerProfile) {
      return new Response(JSON.stringify({ error: 'Caller profile not found' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const allowedCallerRoles = ['super_admin', 'distributor_admin', 'utility_admin'];
    const isSelf = (targetId: string) => caller.id === targetId;

    const body = await req.json();
    const { target_id, password, full_name, phone, role, utility_id, is_active } = body;

    if (!target_id) {
      return new Response(JSON.stringify({ error: 'target_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Users can edit themselves; admins can edit others
    if (!isSelf(target_id) && !allowedCallerRoles.includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If editing another user, check role hierarchy
    if (!isSelf(target_id) && role) {
      const roleHierarchy: Record<string, number> = {
        super_admin: 5, distributor_admin: 4, utility_admin: 3,
        finance: 2, worker: 1, end_user: 0,
      };
      const callerLevel = roleHierarchy[callerProfile.role] ?? -1;
      const targetLevel = roleHierarchy[role] ?? -1;
      if (targetLevel >= callerLevel) {
        return new Response(JSON.stringify({ error: 'Cannot assign equal or higher role' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Update password if provided
    if (password) {
      if (password.length < 6) {
        return new Response(JSON.stringify({ error: 'Password must be at least 6 characters' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { error: pwError } = await adminClient.auth.admin.updateUserById(target_id, { password });
      if (pwError) {
        return new Response(JSON.stringify({ error: pwError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Build profile update — only include provided fields
    const profileUpdate: Record<string, unknown> = {};
    if (full_name !== undefined) profileUpdate.full_name = full_name.trim();
    if (phone !== undefined) profileUpdate.phone = phone?.trim() || null;
    if (role !== undefined && !isSelf(target_id)) profileUpdate.role = role;
    if (utility_id !== undefined && !isSelf(target_id)) profileUpdate.utility_id = utility_id || null;
    if (is_active !== undefined && !isSelf(target_id)) profileUpdate.is_active = is_active;

    if (Object.keys(profileUpdate).length === 0 && !password) {
      return new Response(JSON.stringify({ error: 'No fields to update' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let profile = null;
    if (Object.keys(profileUpdate).length > 0) {
      const { data, error: updateError } = await adminClient
        .from('profiles')
        .update(profileUpdate)
        .eq('id', target_id)
        .select()
        .single();

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      profile = data;
    }

    return new Response(JSON.stringify({ user: profile, success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message ?? 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
