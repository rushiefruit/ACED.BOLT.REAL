import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function callOpenAI(
  apiKey: string,
  messages: Array<{ role: string; content: unknown }>,
  model = "gpt-4o",
  maxTokens = 2048,
) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.choices[0].message.content as string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify user
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) return json({ error: "OPENAI_API_KEY not configured" }, 500);

    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? (await req.json().then((b: Record<string,string>) => b.action).catch(() => null));

    // ── OCR: extract text from a base64 image ─────────────────────────────
    if (action === "ocr") {
      const body = await req.json();
      const { note_id, image_base64, mime_type } = body as {
        note_id: string;
        image_base64: string;
        mime_type: string;
      };

      await supabase.from("notes").update({ status: "processing" }).eq("id", note_id).eq("user_id", user.id);

      let rawText = "";
      try {
        rawText = await callOpenAI(
          openaiKey,
          [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "You are an OCR assistant. Extract ALL text from this image exactly as written, preserving structure (headings, bullet points, numbered lists). Output only the extracted text with no commentary.",
                },
                {
                  type: "image_url",
                  image_url: { url: `data:${mime_type};base64,${image_base64}` },
                },
              ],
            },
          ],
          "gpt-4o",
          4096,
        );
      } catch (e) {
        await supabase.from("notes").update({ status: "error" }).eq("id", note_id).eq("user_id", user.id);
        return json({ error: String(e) }, 500);
      }

      // Generate a brief summary
      const summary = await callOpenAI(
        openaiKey,
        [
          {
            role: "user",
            content: `Summarize the following notes in 2-3 sentences, capturing the main topic and key points:\n\n${rawText}`,
          },
        ],
        "gpt-4o",
        512,
      ).catch(() => "");

      // Auto-generate a title
      const title = await callOpenAI(
        openaiKey,
        [
          {
            role: "user",
            content: `Give a short title (5 words max) for notes about:\n${rawText.slice(0, 400)}`,
          },
        ],
        "gpt-4o-mini",
        64,
      ).catch(() => "Untitled Note");

      await supabase.from("notes").update({
        raw_text: rawText,
        summary: summary || null,
        title: title.replace(/^["']|["']$/g, "").trim(),
        status: "ready",
      }).eq("id", note_id).eq("user_id", user.id);

      return json({ raw_text: rawText, summary, title });
    }

    // ── Ask a question about the note ─────────────────────────────────────
    if (action === "ask") {
      const body = await req.json();
      const { note_id, question } = body as { note_id: string; question: string };

      // Fetch note text
      const { data: note } = await supabase.from("notes").select("raw_text, title").eq("id", note_id).eq("user_id", user.id).maybeSingle();
      if (!note?.raw_text) return json({ error: "Note not found or not yet processed" }, 404);

      // Fetch prior messages (last 10)
      const { data: priorMsgs } = await supabase.from("note_messages")
        .select("role, content")
        .eq("note_id", note_id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(10);

      const history = (priorMsgs ?? []).map((m) => ({ role: m.role, content: m.content }));

      const systemPrompt = `You are a helpful study assistant. The student has uploaded notes titled "${note.title}". Answer questions based ONLY on these notes. Be concise and accurate.\n\nNOTES CONTENT:\n${note.raw_text}`;

      const answer = await callOpenAI(
        openaiKey,
        [
          { role: "system", content: systemPrompt },
          ...history,
          { role: "user", content: question },
        ],
        "gpt-4o",
        1024,
      );

      // Persist both messages
      await supabase.from("note_messages").insert([
        { note_id, user_id: user.id, role: "user", content: question },
        { note_id, user_id: user.id, role: "assistant", content: answer },
      ]);

      return json({ answer });
    }

    // ── Generate flashcards ───────────────────────────────────────────────
    if (action === "flashcards") {
      const body = await req.json();
      const { note_id, count = 10 } = body as { note_id: string; count?: number };

      const { data: note } = await supabase.from("notes").select("raw_text, title").eq("id", note_id).eq("user_id", user.id).maybeSingle();
      if (!note?.raw_text) return json({ error: "Note not found or not yet processed" }, 404);

      const cardCount = Math.min(Math.max(5, count), 20);

      const prompt = `Based on the following notes, generate exactly ${cardCount} flashcards for studying. Each flashcard should have a clear question/term on the front and a concise answer/definition on the back. Return a JSON array only, no markdown, like: [{"front":"...","back":"..."},...]

NOTES:
${note.raw_text}`;

      const raw = await callOpenAI(
        openaiKey,
        [{ role: "user", content: prompt }],
        "gpt-4o",
        2048,
      );

      let cards: Array<{ front: string; back: string }> = [];
      try {
        const cleaned = raw.replace(/```json\n?|\n?```/g, "").trim();
        cards = JSON.parse(cleaned);
      } catch {
        return json({ error: "Failed to parse flashcard response" }, 500);
      }

      // Delete old flashcards for this note
      await supabase.from("flashcards").delete().eq("note_id", note_id).eq("user_id", user.id);

      // Insert new
      const rows = cards.map((c) => ({ note_id, user_id: user.id, front: c.front, back: c.back }));
      const { data: inserted, error: insertErr } = await supabase.from("flashcards").insert(rows).select();
      if (insertErr) return json({ error: insertErr.message }, 500);

      return json({ flashcards: inserted });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
