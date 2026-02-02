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
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    if (req.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
    }

    try {
        const { user_id, full_name, phone, role, role_variant, email } = await req.json();

        if (!user_id) {
            return new Response(JSON.stringify({ success: false, error: "user_id is required" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 1️⃣ Update public.users
        const { error: userError } = await supabaseAdmin.from("users").update({
            full_name,
            phone,
            role,
            email,
        }).eq("id", user_id);
        if (userError) throw userError;

        // 2️⃣ Update auth.users metadata
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
            email,
            user_metadata: { full_name, phone },
        });
        if (authError) throw authError;

        // 3️⃣ Update role-specific tables
        if (role === "operator") {
            const { data: opData } = await supabaseAdmin.from("operators").select("*").eq("id", user_id).single();
            if (opData) await supabaseAdmin.from("operators").update({ role_variant }).eq("id", user_id);
            else await supabaseAdmin.from("operators").insert({ id: user_id, role_variant });
            await supabaseAdmin.from("administration").delete().eq("id", user_id);
        } else if (role === "administration") {
            const { data: adminData } = await supabaseAdmin.from("administration").select("*").eq("id", user_id).single();
            if (!adminData) await supabaseAdmin.from("administration").insert({ id: user_id });
            await supabaseAdmin.from("operators").delete().eq("id", user_id);
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
