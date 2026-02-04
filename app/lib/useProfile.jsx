import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export function useProfile(session) {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!session) return;

        supabase
            .from("users")
            .select("*")
            .eq("id", session.user.id)
            .single()
            .then(({ data }) => {
                setProfile(data);
                setLoading(false);
            });
    }, [session]);

    return { profile, loading };
}
