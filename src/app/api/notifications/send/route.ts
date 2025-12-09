// src/app/api/notifications/send/route.ts
import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { getFirebaseAdmin } from "@/lib/firebase/admin";

export async function POST(req: NextRequest) {
  try {
    const { toUserId, title, body, data } = await req.json();

    const { data: tokens } = await supabase
      .from("user_fcm_tokens")
      .select("token")
      .eq("user_id", toUserId);

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ error: "No FCM token found for user" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const message = {
      tokens: tokens.map(t => t.token),
      notification: { title, body },
      data: data || {},
      webpush: {
        fcmOptions: {
          link: "http://localhost:3000/dashboard/student/collaboration",
        },
      },
    };

    const batchResponse = await getFirebaseAdmin().messaging().sendEachForMulticast(message);

    return new Response(JSON.stringify({ 
      success: true, 
      successCount: batchResponse.successCount,
      failureCount: batchResponse.failureCount
    }), { status: 200 });

  } catch (error) {
    console.error("FCM Send Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}