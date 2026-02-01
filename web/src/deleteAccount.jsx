export async function deleteAccount(user_id) {
    const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ user_id }),
        }
    );

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    return data;
}