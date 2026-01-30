import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const MODEL = "gemini-2.5-flash";

export async function POST(req: Request) {
  try {
    const { message, chatId } = await req.json();
    if (!message?.trim() || !chatId) {
      return NextResponse.json(
        { error: "Message and chatId required" },
        { status: 400 }
      );
    }

    // Fetch full chat history
    const { data: history } = await supabase
      .from("ai_chats")
      .select("sender, message")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    // SYSTEM PROMPT
    const systemPrompt = `
      You are an AI Study Buddy — friendly, helpful, and educational.
      Respond clearly, naturally, and stay on topic using the conversation history.
    `.trim();

    // Initialize the model
    const model = genAI.getGenerativeModel({ 
      model: MODEL,
      systemInstruction: systemPrompt,
    });

    // Build chat history for Gemini format
    const chatHistory = history?.map((m) => ({
      role: m.sender === "user" ? "user" : "model",
      parts: [{ text: m.message }],
    })) || [];

    // Start chat with history
    const chat = model.startChat({
      history: chatHistory,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 800,
      },
    });

    // Send message and get response
    const result = await chat.sendMessage(message);
    const reply = result.response.text().trim();
    
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("AI Chat API Error:", err);
    return NextResponse.json({ reply: "" });
  }
}