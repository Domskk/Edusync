import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { differenceInDays } from "date-fns";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  const { data: assignments, error } = await supabase
    .from("assignments")
    .select("*")
    .eq("is_completed", false);

  if (error) {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  const now = new Date();

  for (const a of assignments) {
    const dueDate = new Date(a.due_date);
    const days = differenceInDays(dueDate, now);

    let message = null;

    if (days === 0) {
      message = `"${a.title}" is due TODAY!`;
    } else if (days === 1) {
      message = `"${a.title}" is due TOMORROW.`;
    }

    if (!message) continue;

    await supabase.from("notifications").insert({
      user_id: a.user_id,
      message,
      type: "assignment_reminder",
      data: { assignmentId: a.id },
      read: false,
    });
  }

  return NextResponse.json({ success: true });
}
