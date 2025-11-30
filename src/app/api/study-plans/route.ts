import { NextResponse } from "next/server";

const MODEL = "openai/gpt-4o-mini"; // or "anthropic/claude-3-5-sonnet-20241022" for even better plans

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { course, examDate, hoursPerDay = "3", topics = "", goal = "exam" } = body;

    if (!course?.trim()) {
      return NextResponse.json({ error: "Course name required" }, { status: 400 });
    }

    const days = examDate
      ? Math.max(1, Math.ceil((new Date(examDate).getTime() - Date.now()) / (86400 * 1000)))
      : 14;

    const prompt = `
You are an expert academic coach creating the perfect study plan.

Course: ${course}
Goal: ${goal}
Daily study time: ${hoursPerDay} hours
${examDate ? `Days until exam: ${days}` : "2-week intensive"}
Topics (if any): ${topics || "cover everything important"}

Return ONLY valid JSON in this exact format:
{
  "title": "14-Day Plan: Organic Chemistry Mastery",
  "duration": "${days} days",
  "dailyHours": "${hoursPerDay}",
  "totalSessions": ${days},
  "schedule": [
    {
      "day": 1,
      "date": "2025-12-01",
      "focus": "Introduction & Basic Concepts",
      "tasks": [
        "Watch lecture 1-2",
        "Read chapter 1 (pages 1-25)",
        "Make summary notes",
        "Do 20 practice questions"
      ],
      "timeEstimate": "3 hours",
      "motivation": "You're starting strong!"
    }
    // ... one object per day
  ]
}
Be encouraging, realistic, and detailed.
`.trim();

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "X-Title": "EduSync Study Plan",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 3000,
      }),
    });

    const data = await res.json();
    let plan;

    try {
      const text = data.choices[0].message.content;
      plan = JSON.parse(text);
    } catch (e) {
      // Fallback if JSON is broken
      plan = {
        title: `${days}-Day Study Plan: ${course}`,
        duration: `${days} days`,
        dailyHours: hoursPerDay,
        schedule: [],
      };
    }

    return NextResponse.json({ plan });
  } catch (error) {
    console.error("Study plan error:", error);
    return NextResponse.json({ error: "Failed to generate plan" }, { status: 500 });
  }
}