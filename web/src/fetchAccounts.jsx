import { supabase } from "./supabase.jsx";

export async function fetchAccounts() {
    const { data, error } = await supabase
        .from("users")
        .select(`
            id,
            staff_id,
            email,
            full_name,
            role,
            phone,
            created_at,
            updated_at
        `)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
}
