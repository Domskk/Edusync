// src/app/api/cron/assignment-reminders/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import { differenceInDays, isToday, isTomorrow } from "date-fns";

// Define types
interface Assignment {
  id: string;
  title: string;
  due_date: string;
  user_id: string;
  is_completed: boolean;
}

interface NotificationResult {
  userId: string;
  assignmentId: string;
  success: boolean;
  successCount: number;
  failureCount: number;
}

export async function GET(req: Request) {
  // Validate cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createClient();

    // Get assignments due in the next 2 days
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);

    const { data: assignments, error } = await supabase
      .from("assignments")
      .select(`
        id,
        title,
        due_date,
        user_id,
        is_completed
      `)
      .eq("is_completed", false)
      .lte("due_date", tomorrow.toISOString())
      .gte("due_date", new Date().toISOString());

    if (error || !assignments) {
      console.error("Error fetching assignments:", error);
      return NextResponse.json(
        { error: "Database error" },
        { status: 500 }
      );
    }

    // Typed notifications list
    const notifications: NotificationResult[] = [];

    // Group assignments by user
    const userAssignments = assignments.reduce<Record<string, Assignment[]>>(
      (acc, assignment) => {
        if (!acc[assignment.user_id]) {
          acc[assignment.user_id] = [];
        }
        acc[assignment.user_id].push(assignment);
        return acc;
      },
      {}
    );

    // Process per user
    for (const [userId, list] of Object.entries(userAssignments)) {
      const { data: tokens } = await supabase
        .from("user_fcm_tokens")
        .select("token")
        .eq("user_id", userId);

      if (!tokens || tokens.length === 0) continue;

      for (const assignment of list) {
        const dueDate = new Date(assignment.due_date);
        const daysUntil = differenceInDays(dueDate, new Date());

        let title = "Assignment Reminder";
        let body = "";

        if (isToday(dueDate)) {
          title = "📅 Assignment Due TODAY!";
          body = `Don't forget: "${assignment.title}" is due today!`;
        } else if (isTomorrow(dueDate)) {
          title = "⚠️ Assignment Due Tomorrow";
          body = `Reminder: "${assignment.title}" is due tomorrow!`;
        } else if (daysUntil <= 2) {
          title = "🔔 Upcoming Assignment";
          body = `"${assignment.title}" is due in ${daysUntil} days.`;
        }

        if (!body) continue;

        try {
          const message = {
            tokens: tokens.map(t => t.token),
            notification: { title, body },
            data: {
              assignmentId: assignment.id,
              type: "assignment_reminder",
            },
            webpush: {
              fcmOptions: {
                link: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/dashboard/student/assignments`,
              },
            },
          };

          const response = await getFirebaseAdmin()
            .messaging()
            .sendEachForMulticast(message);

          notifications.push({
            userId,
            assignmentId: assignment.id,
            success: response.successCount > 0,
            successCount: response.successCount,
            failureCount: response.failureCount,
          });

          // Remove invalid tokens
          if (response.failureCount > 0) {
            response.responses.forEach(async (resp, idx) => {
              if (!resp.success && tokens[idx]) {
                await supabase
                  .from("user_fcm_tokens")
                  .delete()
                  .eq("token", tokens[idx].token);
              }
            });
          }
        } catch (err) {
          console.error("Error sending notification:", err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      notificationsSent: notifications.length,
      notifications,
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
