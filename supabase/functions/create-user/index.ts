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
    // Verify caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Admin client with service role (doesn't affect caller's session)
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify caller's JWT and get their profile
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

    // Get caller's profile to check role
    const { data: callerProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('role, utility_id, distributor_id')
      .eq('id', caller.id)
      .single();

    if (profileError || !callerProfile) {
      return new Response(JSON.stringify({ error: 'Caller profile not found' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const allowedCallerRoles = ['super_admin', 'distributor_admin', 'utility_admin'];
    if (!allowedCallerRoles.includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { email, password, full_name, phone, role, utility_id, is_active } = body;

    // Validate required fields
    if (!email || !password || !full_name || !role) {
      return new Response(JSON.stringify({ error: 'Missing required fields: email, password, full_name, role' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Role hierarchy enforcement
    const roleHierarchy: Record<string, number> = {
      super_admin: 5,
      distributor_admin: 4,
      utility_admin: 3,
      finance: 2,
      worker: 1,
      end_user: 0,
    };

    const callerLevel = roleHierarchy[callerProfile.role] ?? -1;
    const targetLevel = roleHierarchy[role] ?? -1;

    if (targetLevel >= callerLevel) {
      return new Response(JSON.stringify({ error: 'Cannot create user with equal or higher role' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // utility_admin can only create users for their own utility
    const effectiveUtilityId =
      callerProfile.role === 'utility_admin' ? callerProfile.utility_id : utility_id;

    // Create auth user - this runs server-side so doesn't affect caller's session
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: { full_name, role },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!newUser.user) {
      return new Response(JSON.stringify({ error: 'User creation failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Upsert profile - handles both cases: trigger already created it, or it hasn't fired yet
    const { data: profile, error: updateError } = await adminClient
      .from('profiles')
      .upsert({
        id: newUser.user.id,
        email: email.trim(),
        full_name: full_name.trim(),
        phone: phone?.trim() || null,
        role,
        utility_id: effectiveUtilityId || null,
        distributor_id: callerProfile.distributor_id || null,
        is_active: is_active ?? true,
      })
      .select()
      .single();

    if (updateError) {
      // Rollback: delete the auth user if profile update fails
      await adminClient.auth.admin.deleteUser(newUser.user.id);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ user: profile }), {
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
