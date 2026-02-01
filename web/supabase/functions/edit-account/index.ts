import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
);

Deno.serve(async (req) => {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

    try {
        const { user_id, full_name, phone, role, role_variant } = await req.json();

        // 1️⃣ Update users table
        const { error: userError } = await supabase.from("users").update({
            full_name,
            phone,
            role,
        }).eq("id", user_id);
        if (userError) throw userError;

        // 2️⃣ Update role-specific table
        if (role === "operator") {
            // Check if operator exists
            const { data: opData } = await supabase.from("operators").select("*").eq("id", user_id).single();
            if (opData) {
                await supabase.from("operators").update({ role_variant }).eq("id", user_id);
            } else {
                await supabase.from("operators").insert({ id: user_id, role_variant });
            }
            // Remove admin if exists
            await supabase.from("administration").delete().eq("id", user_id);
        } else if (role === "administration") {
            const { data: adminData } = await supabase.from("administration").select("*").eq("id", user_id).single();
            if (!adminData) await supabase.from("administration").insert({ id: user_id });
            // Remove operator if exists
            await supabase.from("operators").delete().eq("id", user_id);
        }

        return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
    } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});
