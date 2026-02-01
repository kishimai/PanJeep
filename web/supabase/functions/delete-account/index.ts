import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(
          JSON.stringify({ error: "user_id is required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
      );
    }

    // 1️⃣ Delete role-specific tables FIRST
    await supabaseAdmin.from("operators").delete().eq("id", user_id);
    await supabaseAdmin.from("administration").delete().eq("id", user_id);

    // 2️⃣ Delete from public.users
    const { error: userError } = await supabaseAdmin
        .from("users")
        .delete()
        .eq("id", user_id);

    if (userError) throw userError;

    // 3️⃣ Delete from auth.users LAST
    const { error: authError } =
        await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (authError) throw authError;

    return new Response(
        JSON.stringify({ success: true }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
    );
  } catch (err) {
    return new Response(
        JSON.stringify({ error: err?.message || "Internal error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
    );
  }
});
