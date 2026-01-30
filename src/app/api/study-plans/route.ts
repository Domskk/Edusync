import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const MODEL = "gemini-2.5-flash"; 

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      course,
      examDate,
      hoursPerDay = "3",
      topics = "",
      goal = "exam",
    } = body;

    if (!course?.trim()) {
      return NextResponse.json({ error: "Course name is required" }, { status: 400 });
    }

    const days = examDate
      ? Math.max(1, Math.ceil((new Date(examDate).getTime() - Date.now()) / 86_400_000))
      : 14;

    const prompt = `You are the world's best academic coach.

Course: ${course}
Goal: ${goal}
Daily study time: ${hoursPerDay} hours
${examDate ? `Days until exam: ${days}` : "Duration: 14-day intensive"}
Topics to focus on: ${topics || "all essential topics"}

Return ONLY a valid JSON object with this exact structure. NO markdown. NO code blocks.

{
  "title": "${days}-Day Plan: ${course}",
  "duration": "${days} days",
  "dailyHours": "${hoursPerDay}",
  "totalSessions": ${days},
  "schedule": [
    {
      "day": 1,
      "date": "2025-12-01",
      "focus": "Foundations",
      "tasks": ["Watch intro lecture", "Read chapter 1", "Make notes", "Solve 15 questions"],
      "timeEstimate": "${hoursPerDay} hours",
      "motivation": "Day 1 sets the tone - you're already ahead!"
    }
    // ... one object per day, up to day ${days}
  ]
}

Rules:
- Return ONLY the JSON
- No explanations
- No code blocks
- No extra text`;

    const model = genAI.getGenerativeModel({ 
      model: MODEL,
      systemInstruction: "You respond only with valid JSON. No markdown. No explanations.",
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 3500,
      },
    });

    const result = await model.generateContent(prompt);
    const raw = result.response.text() || "";

    const clean = raw.replace(/```json/gi, "").replace(/```/g, "").trim();

    const match = clean.match(/\{[\s\S]*\}/);
    const jsonStr = match ? match[0] : clean;

    let plan;
    try {
      plan = JSON.parse(jsonStr);
    } catch (e) {
      console.error("JSON parse failed. Raw:", raw, "Error:", e);
      // Safe fallback
      plan = {
        title: `${days}-Day Plan: ${course}`,
        duration: `${days} days`,
        dailyHours: hoursPerDay,
        totalSessions: days,
        schedule: Array.from({ length: days }, (_, i) => ({
          day: i + 1,
          date: new Date(Date.now() + i * 86_400_000).toISOString().split("T")[0],
          focus: "Study Session",
          tasks: ["Review material", "Practice problems", "Take notes"],
          timeEstimate: `${hoursPerDay} hours`,
          motivation: "Keep going — you're building momentum!",
        })),
      };
    }

    return NextResponse.json({ plan });

  } catch (error) {
    console.error("Study plan API error:", error);
    return NextResponse.json(
      { error: "Failed to generate plan", details: (error as Error).message },
      { status: 500 }
    );
  }
}