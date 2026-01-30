import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const MODEL = "gemini-2.5-flash";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, numCards, deckId, userId } = body;

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }
    if (!deckId) {
      return NextResponse.json({ error: "Deck ID is required" }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }
    if (!numCards) {
      return NextResponse.json({ error: "Number of cards is required" }, { status: 400 });
    }

    // Parse and validate numCards
    const cardCount = parseInt(String(numCards), 10);
    if (isNaN(cardCount) || cardCount < 5 || cardCount > 50) {
      return NextResponse.json(
        { error: "Number of cards must be between 5 and 50" },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({
      model: MODEL,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4000,
      },
    });

    const systemPrompt = `
You are an expert flashcard creator for active recall and spaced repetition.

Generate exactly ${cardCount} high-quality flashcards based on the user's request.

Rules:
- Front: clear question, term, cloze prompt or problem that forces recall
- Back: complete, concise, accurate answer (explanation + key facts)
- Use {{c1:: }} for cloze deletions when it makes sense (definitions, lists, formulas)
- Keep front short (5–20 words), back informative but concise (10–80 words)
- Cover core concepts, facts, dates, formulas, processes, causes/effects
- Output ONLY the JSON array — no explanations, no markdown, no code blocks, no extra characters!

Output format (nothing else):
[
  {"front": "Question or term here", "back": "Full answer here"},
  ...
]

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

    let cards;
    try {
      cards = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error("JSON parse failed. Cleaned string:", jsonStr);
      console.error(parseErr);
      return NextResponse.json(
        { error: "Failed to parse flashcards from AI response" },
        { status: 500 }
      );
    }

    if (!Array.isArray(cards) || cards.length === 0) {
      return NextResponse.json(
        { error: "No valid flashcards generated" },
        { status: 400 }
      );
    }

    // Clean each card
    cards = cards.map((card) => ({
      front: String(card.front ?? "").trim(),
      back: String(card.back ?? "").trim(),
    }));

    return NextResponse.json({
      success: true,
      cards: cards,
      count: cards.length,
    });
  } catch (error) {
    console.error("Flashcard generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}