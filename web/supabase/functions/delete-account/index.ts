import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(
          JSON.stringify({ error: "user_id is required" }),
          { status: 400 }
      );
    }

    const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1️⃣ Delete from auth.users
    const { error: authError } =
        await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (authError) throw authError;

    // 2️⃣ Delete from public.users
    const { error: dbError } = await supabaseAdmin
        .from("users")
        .delete()
        .eq("id", user_id);

    if (dbError) throw dbError;

    return new Response(
        JSON.stringify({ success: true }),
        { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
        JSON.stringify({ error: err.message }),
        { status: 500 }
    );
  }
});
