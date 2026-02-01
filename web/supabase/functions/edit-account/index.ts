import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const { user_id, full_name, role, role_variant } = await req.json();

    if (!user_id) {
      return new Response(
          JSON.stringify({ error: "user_id is required" }),
          { status: 400 }
      );
    }

    const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await supabaseAdmin
        .from("users")
        .update({
          full_name,
          role,
          role_variant,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user_id);

    if (error) throw error;

    return new Response(
        JSON.stringify({ success: true }),
        { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
        JSON.stringify({ error: err.message }),
        { status: 500 }
    );
  }
});
