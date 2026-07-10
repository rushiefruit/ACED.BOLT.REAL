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
  messages: Array<{ role: string; content: string }>,
  model = "gpt-4o",
  maxTokens = 1024,
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

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) return json({ error: "OPENAI_API_KEY not configured" }, 500);

    const body = await req.json();
    const { message } = body as { message: string };
    if (!message?.trim()) return json({ error: "Message is required" }, 400);

    // Fetch user context: tasks + events + profile
    const [tasksRes, eventsRes, profileRes] = await Promise.all([
      userClient.from("tasks").select("title, type, priority, due_date, status, subject:subjects(name)").eq("user_id", user.id),
      userClient.from("events").select("title, type, start_time, end_time").eq("user_id", user.id),
      userClient.from("profiles").select("full_name, school, grade_level").eq("id", user.id).maybeSingle(),
    ]);

    const tasks = tasksRes.data ?? [];
    const events = eventsRes.data ?? [];
    const profile = profileRes.data;

    const pendingTasks = tasks.filter((t: Record<string, unknown>) => t.status !== "completed");
    const taskSummary = pendingTasks.length > 0
      ? pendingTasks.map((t: Record<string, unknown>) => {
          const subj = (t.subject as Record<string, string> | null)?.name ?? "General";
          const days = Math.ceil((new Date(t.due_date as string).getTime() - Date.now()) / 86400000);
          return `- "${t.title}" (${subj}, ${t.type}, ${t.priority} priority, due in ${days}d)`;
        }).join("\n")
      : "No pending tasks.";
    const eventSummary = events.length > 0
      ? events.map((e: Record<string, unknown>) => `- ${e.title} (${e.type}, ${new Date(e.start_time as string).toLocaleString()})`).join("\n")
      : "No scheduled events.";
    const profileStr = profile
      ? `Name: ${profile.full_name ?? "Unknown"}, School: ${profile.school ?? "N/A"}, Grade: ${profile.grade_level ?? "N/A"}`
      : "No profile info.";

    const systemPrompt = `You are Atlas, a friendly and knowledgeable study assistant chatbot for students. You help with study planning, explaining concepts, motivation, and time management. Be concise, warm, and actionable. Use the student's real context when relevant.

STUDENT CONTEXT:
${profileStr}

CURRENT TASKS:
${taskSummary}

SCHEDULE:
${eventSummary}

Guidelines:
- Keep responses concise (2-4 sentences unless the student asks for detail).
- Reference the student's actual tasks and schedule when helpful.
- Offer specific, actionable advice.
- Be encouraging and supportive.`;

    // Fetch conversation history (last 20 messages)
    const { data: priorMsgs } = await supabase.from("chat_messages")
      .select("role, content")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(20);

    const history = (priorMsgs ?? []).map((m) => ({ role: m.role, content: m.content }));

    const answer = await callOpenAI(
      openaiKey,
      [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: message },
      ],
      "gpt-4o",
      1024,
    );

    // Persist both messages
    await supabase.from("chat_messages").insert([
      { user_id: user.id, role: "user", content: message },
      { user_id: user.id, role: "assistant", content: answer },
    ]);

    return json({ answer });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
