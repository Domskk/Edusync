import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // MUST be service role key
);

const MODEL = "gpt-3.5-turbo";

export async function POST(req: Request) {
  try {
    const { message, chatId } = await req.json();
    if (!message?.trim() || !chatId) {
      return NextResponse.json(
        { error: "Message and chatId required" },
        { status: 400 }
      );
    }

    //  Fetch full chat history
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

    // Build messages array
    const messages = [
      { role: "system", content: systemPrompt },
      ...(history?.map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.message,
      })) || []),
      { role: "user", content: message },
    ];

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

    //  Call OpenRouter
    const res = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": siteUrl,
          "X-Title": "AI Study Buddy",
        },
        body: JSON.stringify({
          model: MODEL,
          messages,
          temperature: 0.7,
          max_tokens: 800,
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("[OpenRouter Error]", errText);
      return NextResponse.json({ reply: "" });
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || "";
    
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("AI Chat API Error:", err);
    return NextResponse.json({ reply: "" });
  }
}
