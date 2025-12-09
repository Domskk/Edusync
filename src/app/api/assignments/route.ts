import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("assignments")
    .select("*")
    .eq("user_id", user.id)
    .order("due_date", { ascending: true });

  return NextResponse.json({ data, error });
}

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const { data, error } = await supabase
    .from("assignments")
    .insert({
      user_id: user.id,
      title: body.title,
      due_date: body.due_date,
      description: body.description ?? null,
      subject: body.subject ?? null,
    })
    .select()
    .single();

  return NextResponse.json({ data, error });
}

export async function PUT(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const { data, error } = await supabase
    .from("assignments")
    .update({
      title: body.title,
      due_date: body.due_date,
      description: body.description ?? null,
      subject: body.subject ?? null,
    })
    .eq("id", body.id)
    .eq("user_id", user.id)
    .select()
    .single();

  return NextResponse.json({ data, error });
}

export async function DELETE(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get the ID from the URL
  const url = new URL(req.url);
  const id = url.pathname.split('/').pop();

  if (!id) {
    return NextResponse.json({ error: "Missing assignment ID" }, { status: 400 });
  }

  const { error } = await supabase
    .from("assignments")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  return NextResponse.json({ success: !error, error });
}