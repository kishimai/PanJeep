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
    // 1️⃣ Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    // 2️⃣ Only allow POST
    if (req.method !== "POST") {
        return new Response(JSON.stringify({ success: false, error: "Method Not Allowed" }), {
            status: 405,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    try {
        const { user_id } = await req.json();

        if (!user_id) throw new Error("user_id is required");

        // 3️⃣ Delete role-specific tables first
        await supabaseAdmin.from("operators").delete().eq("id", user_id);
        await supabaseAdmin.from("administration").delete().eq("id", user_id);

        // 4️⃣ Delete from public.users
        const { error: userError } = await supabaseAdmin.from("users").delete().eq("id", user_id);
        if (userError) throw userError;

        // 5️⃣ Delete from auth.users
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user_id);
        if (authError) throw authError;

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err?.message || "Internal error" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
