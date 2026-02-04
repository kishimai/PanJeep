// supabase/functions/create-account/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user_id, email, role = 'passenger' } = await req.json();

    // Validate required fields
    if (!user_id) throw new Error('User ID is required');
    if (!email) throw new Error('Email is required');

    // Create Supabase admin client using secrets
    const supabaseAdmin = createClient(
        Deno.env.get('PROJECT_URL')!,
        Deno.env.get('SERVICE_ROLE_KEY')!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Check if profile already exists
    const { data: existing } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', user_id)
        .maybeSingle();

    if (existing) {
      // Profile exists, update it
      const { error: updateError, data: profileData } = await supabaseAdmin
          .from('users')
          .update({
            email,
            role,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user_id)
          .select()
          .single();

      if (updateError) throw updateError;

      return new Response(
          JSON.stringify({
            success: true,
            profile: profileData,
            message: 'Profile updated'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Create new profile
    const { error: profileError, data: profileData } = await supabaseAdmin
        .from('users')
        .insert({
          id: user_id, // Link to auth user ID
          email,
          role,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

    if (profileError) throw profileError;

    return new Response(
        JSON.stringify({
          success: true,
          profile: profileData,
          message: 'Profile created'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 }
    );

  } catch (err) {
    return new Response(
        JSON.stringify({
          success: false,
          error: err.message
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});