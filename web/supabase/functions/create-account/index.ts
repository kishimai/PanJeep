// supabase/functions/create-account/index.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
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
    const chars =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
    let password = "";
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

export default async function handler(req) {
    // Handle OPTIONS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
            },
        });
    }

    try {
        const { email, full_name, role, role_variant } = await req.json();

        const staff_id = generateStaffId(role);
        const password = generateTempPassword();

        // 1️⃣ Create Auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            user_metadata: { full_name, role, staff_id },
        });
        if (authError) throw authError;

        // 2️⃣ Insert into public.users
        const { error: userError } = await supabase.from("users").insert([
            {
                id: authData.id,
                email,
                full_name,
                role,
                staff_id,
            },
        ]);
        if (userError) throw userError;

        // 3️⃣ Insert role_variant into operators if operator
        if (role.toLowerCase() === "operator") {
            const { error: opError } = await supabase.from("operators").insert([
                {
                    id: authData.id,
                    role_variant: role_variant || null,
                },
            ]);
            if (opError) throw opError;
        }

        // 4️⃣ Return credentials with proper CORS headers
        return new Response(JSON.stringify({ success: true, staff_id, password, email }), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 400,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
        });
    }
}
