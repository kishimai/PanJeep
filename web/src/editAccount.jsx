export async function editAccount({
                                      user_id,
                                      full_name,
                                      role,
                                      role_variant,
                                  }) {
    const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/edit-account`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
                user_id,
                full_name,
                role,
                role_variant,
            }),
        }
    );

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    return data;
}