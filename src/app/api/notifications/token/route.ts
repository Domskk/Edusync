// src/app/api/notifications/token/route.ts
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { token } = await req.json();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return new Response("Unauthorized", { status: 401 });

  const { error } = await supabase
    .from("user_fcm_tokens")
    .upsert({ user_id: user.id, token }, { onConflict: "user_id" });

  return error ? new Response("Error", { status: 500 }) : new Response("OK", { status: 200 });
}
