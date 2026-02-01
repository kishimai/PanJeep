import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
);

function generateStaffId(role = "OP") {
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const random = Math.floor(Math.random() * 9000 + 1000);
    return `${role.toUpperCase()}-${y}${m}${d}-${random}`;
}

function generateTempPassword(length = 8) {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
    let password = "";
    for (let i = 0; i < length; i++) password += chars.charAt(Math.floor(Math.random() * chars.length));
    return password;
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    try {
        const { email, full_name, role, role_variant, phone } = await req.json();

        const staff_id = generateStaffId(role);
        const password = generateTempPassword();

        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            user_metadata: { full_name, role, staff_id, phone },
        });
        if (authError) throw authError;

        const { error: userError } = await supabase.from("users").insert([
            { id: authData.user.id, email, full_name, phone, role, staff_id },
        ]);
        if (userError) throw userError;

        if (role === "operator") {
            const { error: opError } = await supabase.from("operators").insert([
                { id: authData.user.id, role_variant: role_variant || null },
            ]);
            if (opError) throw opError;
        } else if (role === "administration") {
            const { error: adminError } = await supabase.from("administration").insert([
                { id: authData.user.id },
            ]);
            if (adminError) throw adminError;
        }

        return new Response(JSON.stringify({ success: true, staff_id, password, email }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    } catch (err) {
        return new Response(
            JSON.stringify({ success: false, error: err?.message || "Internal error" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
    }
});
