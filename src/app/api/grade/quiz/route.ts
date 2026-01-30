import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const MODEL = "gemini-2.5-flash";

interface QuestionToGrade {
  question: string;
  correctAnswer: string;
  userAnswer: string;
  questionId: string;
}

interface GradedResult {
  questionId: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  feedback: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { questions } = body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: "Questions are required" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({
      model: MODEL,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 8000,
      },
    });

    const systemPrompt = `
You are an expert teacher grading quiz answers. You will receive a list of questions with the correct answer and the student's answer.

For each question, you must:
1. Determine if the student's answer is correct, partially correct, or incorrect
2. Consider that answers don't need to be word-for-word identical - focus on whether the key concepts are present
3. Be fair and generous - if the answer demonstrates understanding, mark it correct even if phrased differently
4. Provide brief, constructive feedback explaining why the answer is correct or what was missing

Output ONLY a JSON array with this exact structure:
[
  {
    "questionId": "the question ID provided",
    "isCorrect": true or false,
    "feedback": "Brief explanation of the grading decision"
  },
  ...
]

Questions to grade:
${questions.map((q: QuestionToGrade, idx: number) => `
Question ${idx + 1} (ID: ${q.questionId}):
Q: ${q.question}
Correct Answer: ${q.correctAnswer}
Student Answer: ${q.userAnswer}
`).join('\n')}

Remember: Output ONLY the JSON array, no markdown, no code blocks, no extra text!
    `.trim();

    const result = await model.generateContent(systemPrompt);
    let text = result.response.text().trim();

    // ─── Aggressive cleaning ───
    text = text.replace(/^```json\s*/i, '')
               .replace(/\s*```$/i, '')
               .replace(/^`\s*/i, '')
               .replace(/\s*`$/i, '')
               .trim();

    // Find the array
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (!arrayMatch) {
      console.error("No JSON array found. Raw:", text);
      return NextResponse.json(
        { error: "AI did not return a valid JSON array" },
        { status: 500 }
      );
    }

    const jsonStr = arrayMatch[0];

    let gradedResults;
    try {
      gradedResults = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error("JSON parse failed. Cleaned string:", jsonStr);
      console.error(parseErr);
      return NextResponse.json(
        { error: "Failed to parse grading results from AI response" },
        { status: 500 }
      );
    }

    if (!Array.isArray(gradedResults)) {
      return NextResponse.json(
        { error: "Invalid grading results format" },
        { status: 400 }
      );
    }

    // Combine AI grading with original data
    const results: GradedResult[] = questions.map((q: QuestionToGrade) => {
      const aiGrade = gradedResults.find((r: { questionId: string }) => r.questionId === q.questionId);
      
      return {
        questionId: q.questionId,
        userAnswer: q.userAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect: aiGrade?.isCorrect ?? false,
        feedback: aiGrade?.feedback ?? "Unable to grade this answer.",
      };
    });

    return NextResponse.json({
      success: true,
      results: results,
    });
  } catch (error) {
    console.error("Quiz grading error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}