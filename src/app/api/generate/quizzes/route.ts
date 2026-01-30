import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const MODEL = "gemini-2.5-flash";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, numQuestions, quizId, userId } = body;

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }
    if (!quizId) {
      return NextResponse.json({ error: "Quiz ID is required" }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }
    if (!numQuestions) {
      return NextResponse.json({ error: "Number of questions is required" }, { status: 400 });
    }

    // Parse and validate numQuestions
    const questionCount = parseInt(String(numQuestions), 10);
    if (isNaN(questionCount) || questionCount < 5 || questionCount > 30) {
      return NextResponse.json(
        { error: "Number of questions must be between 5 and 30" },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({
      model: MODEL,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 6000,
      },
    });

    const systemPrompt = `
You are an expert quiz creator for educational assessments.

Generate exactly ${questionCount} high-quality open-ended questions based on the user's request.

Rules:
- Each question should require a written answer (short answer or essay style)
- Questions should test understanding, critical thinking, and application of knowledge
- Include the correct/model answer for each question
- Vary difficulty levels appropriately
- Make questions clear and specific
- Output ONLY the JSON array — no explanations, no markdown, no code blocks, no extra characters!

Output format (nothing else):
[
  {
    "question": "Clear question text here?",
    "correct_answer": "The model answer or key points that should be in a correct answer"
  },
  ...
]

Notes:
- Questions can be short answer or require longer responses
- correct_answer should contain the ideal answer or key points expected
- Ensure questions are unambiguous and test meaningful understanding

User request: ${prompt}
    `.trim();

    const result = await model.generateContent(systemPrompt);
    let text = result.response.text().trim();

    // ─── Aggressive cleaning to fix trailing junk ───
    text = text.replace(/^```json\s*/i, '')
               .replace(/\s*```$/i, '')
               .replace(/^`\s*/i, '')
               .replace(/\s*`$/i, '')
               .trim();

    // Find the array (even if there's trailing garbage)
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (!arrayMatch) {
      console.error("No JSON array found. Raw:", text);
      return NextResponse.json(
        { error: "AI did not return a valid JSON array" },
        { status: 500 }
      );
    }

    const jsonStr = arrayMatch[0];

    let questions;
    try {
      questions = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error("JSON parse failed. Cleaned string:", jsonStr);
      console.error(parseErr);
      return NextResponse.json(
        { error: "Failed to parse quiz questions from AI response" },
        { status: 500 }
      );
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: "No valid questions generated" },
        { status: 400 }
      );
    }

    // Validate and clean each question
    questions = questions
      .filter(q => {
        return q.question && q.correct_answer;
      })
      .map((q) => ({
        question: String(q.question ?? "").trim(),
        correct_answer: String(q.correct_answer ?? "").trim(),
      }));

    if (questions.length === 0) {
      return NextResponse.json(
        { error: "No valid questions after filtering" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      questions: questions,
      count: questions.length,
    });
  } catch (error) {
    console.error("Quiz generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}