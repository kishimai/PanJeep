import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "authorization, content-type",
            },
        });
    }

    try {
        const { email, full_name, role, role_variant } = await req.json();

        if (!email || !role) {
            return new Response(
                JSON.stringify({ error: "Missing required fields" }),
                { status: 400 }
            );
        }

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        // 1️⃣ Generate password
        const tempPassword = crypto.randomUUID().slice(0, 8);

        // 2️⃣ Generate human-readable staff ID
        const staffId =
            role.substring(0, 3).toUpperCase() +
            "-" +
            Math.floor(100000 + Math.random() * 900000);

        // 3️⃣ Create Auth user
        const { data: authUser, error: authError } =
            await supabase.auth.admin.createUser({
                email,
                password: tempPassword,
                email_confirm: true,
            });

        if (authError) throw authError;

        // 4️⃣ Insert into users table
        const { data: userRow, error: dbError } = await supabase
            .from("users")
            .insert({
                id: authUser.user.id,
                staff_id: staffId,
                email,
                full_name,
                role,
                phone_number: userRow.phone_number,
            })
            .select()
            .single();

        if (dbError) throw dbError;

        // 5️⃣ Return everything frontend needs
        return new Response(
            JSON.stringify({
                success: true,
                user: userRow,
                temp_password: tempPassword,
            }),
            {
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
            }
        );
    } catch (err) {
        return new Response(
            JSON.stringify({ error: err.message }),
            { status: 500 }
        );
    }
});
