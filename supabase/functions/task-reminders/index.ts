import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in1h = new Date(now.getTime() + 60 * 60 * 1000);
    const sent: string[] = [];

    // 24-hour-before reminders: due within next 24h, not yet notified
    const { data: due24, error: e24 } = await supabase
      .from("tasks")
      .select("id, user_id, title, due_date, type, subject_id")
      .eq("status", "pending")
      .eq("notified_24h", false)
      .lte("due_date", in24h.toISOString())
      .gt("due_date", now.toISOString());

    if (e24) throw e24;

    if (due24 && due24.length > 0) {
      const notifs = due24.map((t) => ({
        user_id: t.user_id,
        title: "Due Tomorrow",
        message: `"${t.title}" is due ${new Date(t.due_date).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}. Don't forget to finish it!`,
        type: "reminder",
        icon: "clock",
        action_url: "/planner",
      }));
      const { error: insErr } = await supabase.from("notifications").insert(notifs);
      if (insErr) throw insErr;
      const ids = due24.map((t) => t.id);
      const { error: updErr } = await supabase
        .from("tasks")
        .update({ notified_24h: true })
        .in("id", ids);
      if (updErr) throw updErr;
      sent.push(...ids);
    }

    // 1-hour-before reminders: due within next hour, not yet notified
    const { data: due1, error: e1 } = await supabase
      .from("tasks")
      .select("id, user_id, title, due_date, type")
      .eq("status", "pending")
      .eq("notified_1h", false)
      .lte("due_date", in1h.toISOString())
      .gt("due_date", now.toISOString());

    if (e1) throw e1;

    if (due1 && due1.length > 0) {
      const notifs = due1.map((t) => ({
        user_id: t.user_id,
        title: "Due in 1 Hour",
        message: `"${t.title}" is due very soon — wrap it up now!`,
        type: "alert",
        icon: "alert-circle",
        action_url: "/planner",
      }));
      const { error: insErr } = await supabase.from("notifications").insert(notifs);
      if (insErr) throw insErr;
      const ids = due1.map((t) => t.id);
      const { error: updErr } = await supabase
        .from("tasks")
        .update({ notified_1h: true })
        .in("id", ids);
      if (updErr) throw updErr;
      sent.push(...ids);
    }

    return new Response(
      JSON.stringify({ ok: true, sent24h: due24?.length ?? 0, sent1h: due1?.length ?? 0, sent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
