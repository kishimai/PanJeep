// src/createAccount.jsx

export async function createAccount({ email, role, full_name, role_variant }) {
    try {
        const res = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-account`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    // For frontend testing, you can use anon key
                    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                },
                body: JSON.stringify({ email, role, full_name, role_variant }),
            }
        );

        const data = await res.json();

        if (!res.ok) {
            // Throwing the message from Edge Function
            throw new Error(data.error || "Unknown error creating account");
        }

        return data; // { success: true, staff_id, email, password }
    } catch (err) {
        console.error("Create Account failed:", err);
        throw err;
    }
}
