// src/createAccount.jsx

// Use anon key only for calling Edge Function
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Utility to generate random staff ID (e.g., OP-20260201-1234)
function generateStaffId(role = "OP") {
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const random = Math.floor(Math.random() * 9000 + 1000); // 4-digit random
    return `${role.toUpperCase()}-${y}${m}${d}-${random}`;
}

// Utility to generate random temporary password (8 chars)
function generateTempPassword(length = 8) {
    const chars =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
    let password = "";
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}


export async function createAccount({ email, full_name, role, role_variant }) {
    try {
        const res = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-account`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                },
                body: JSON.stringify({ email, full_name, role, role_variant }),
            }
        );

        const data = await res.json(); // ✅ ONLY ONCE

        if (!res.ok) {
            throw new Error(data?.error || "Unknown error creating account");
        }

        return {
            staff_id: data.staff_id,
            password: data.password,
            email: data.email,
        };
    } catch (err) {
        console.error("Create Account failed:", err);
        throw err;
    }
}




