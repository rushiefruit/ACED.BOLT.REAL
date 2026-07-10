import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function htmlRedirect(appUrl: string, status: "success" | "error", message?: string) {
  const params = new URLSearchParams({ gcal: status });
  if (message) params.set("gcal_msg", message);
  const dest = appUrl ? `${appUrl}?${params}` : `/?${params}`;
  return new Response(
    `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${dest}"></head><body><script>window.location.href=${JSON.stringify(dest)}</script></body></html>`,
    { status: 200, headers: { "Content-Type": "text/html" } },
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
  const redirectUri = `${supabaseUrl}/functions/v1/google-calendar-callback`;

  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  // Parse state early so we can redirect to correct app URL even on errors
  let userId = "";
  let appUrl = Deno.env.get("APP_URL") ?? "";
  if (stateRaw) {
    try {
      const stateObj = JSON.parse(atob(stateRaw));
      userId = stateObj.userId ?? "";
      appUrl = stateObj.appUrl ?? appUrl;
    } catch {
      // fall through with defaults
    }
  }

  if (errorParam) return htmlRedirect(appUrl, "error", errorParam);
  if (!code || !stateRaw) return htmlRedirect(appUrl, "error", "Missing code or state");
  if (!userId) return htmlRedirect(appUrl, "error", "Invalid state: no user ID");

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      return htmlRedirect(appUrl, "error", `Token exchange failed: ${err}`);
    }
    const tokenData = await tokenRes.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    await supabase.from("google_calendar_tokens").upsert({
      user_id: userId,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token ?? null,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    // Fetch Google Calendar events (next 60 days)
    const now = new Date();
    const future = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const calRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      new URLSearchParams({
        timeMin: now.toISOString(),
        timeMax: future.toISOString(),
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "100",
      }),
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } },
    );

    let importedEvents = 0;
    let importedTasks = 0;

    if (calRes.ok) {
      const calData = await calRes.json() as { items?: Record<string, unknown>[] };
      const items = calData.items ?? [];
      const EVENT_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#a855f7", "#f43f5e", "#06b6d4"];

      const eventsToInsert = items
        .filter((item) => {
          const start = item.start as Record<string, string> | undefined;
          return item.status !== "cancelled" && (start?.dateTime || start?.date);
        })
        .map((item, idx) => {
          const start = item.start as Record<string, string>;
          const end = item.end as Record<string, string> | undefined;
          const startStr = start.dateTime ?? `${start.date}T09:00:00`;
          const endStr = end?.dateTime ?? (end?.date ? `${end.date}T10:00:00` : new Date(new Date(startStr).getTime() + 3600000).toISOString());
          return {
            user_id: userId,
            title: (item.summary as string) ?? "Untitled Event",
            type: "activity",
            start_time: startStr,
            end_time: endStr,
            location: (item.location as string) ?? null,
            color: EVENT_COLORS[idx % EVENT_COLORS.length],
            is_recurring: !!(item.recurrence || item.recurringEventId),
          };
        });

      if (eventsToInsert.length > 0) {
        const { error } = await supabase.from("events").insert(eventsToInsert);
        if (!error) importedEvents = eventsToInsert.length;
      }
    }

    // Fetch Google Tasks
    const tasksListRes = await fetch(
      "https://tasks.googleapis.com/tasks/v1/users/@me/lists",
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } },
    );

    if (tasksListRes.ok) {
      const listsData = await tasksListRes.json() as { items?: Record<string, unknown>[] };
      const lists = listsData.items ?? [];

      for (const list of lists.slice(0, 3)) {
        const taskRes = await fetch(
          `https://tasks.googleapis.com/tasks/v1/lists/${list.id as string}/tasks?` +
          new URLSearchParams({ showCompleted: "false", maxResults: "50" }),
          { headers: { Authorization: `Bearer ${tokenData.access_token}` } },
        );
        if (!taskRes.ok) continue;

        const taskData = await taskRes.json() as { items?: Record<string, unknown>[] };
        const gTasks = (taskData.items ?? []).filter((t) => t.title && t.status !== "completed");

        const tasksToInsert = gTasks.map((t) => ({
          user_id: userId,
          title: t.title as string,
          description: (t.notes as string) ?? null,
          type: "homework",
          priority: "medium",
          due_date: t.due
            ? new Date(t.due as string).toISOString()
            : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          estimated_minutes: 30,
          status: "pending",
          subject_id: null,
        }));

        if (tasksToInsert.length > 0) {
          const { error } = await supabase.from("tasks").insert(tasksToInsert);
          if (!error) importedTasks += tasksToInsert.length;
        }
      }
    }

    return htmlRedirect(appUrl, "success", `Imported ${importedEvents} events and ${importedTasks} tasks`);
  } catch (err) {
    return htmlRedirect(appUrl, "error", String(err));
  }
});
