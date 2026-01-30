// src/app/api/notifications/send/route.ts  
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { toUserId, message, type, data } = await req.json();

  const { error } = await (await supabase)
    .from("notifications")
    .insert({
      user_id: toUserId,
      message,
      type: type ?? "general",
      data: data ?? {},
      read: false,
    });

  if (error) {
    console.error(error);
    return new Response(JSON.stringify({ error }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
