import { calendarApi, getGoogleClient } from "./google";
import { mockEvents } from "./mock-data";
import type { CalendarEvent } from "./types";

export async function listEvents(userId: string, from: Date, to: Date): Promise<{ events: CalendarEvent[]; source: "google" | "mock" }> {
  const auth = await getGoogleClient(userId);
  if (!auth) {
    const events = mockEvents().filter((e) => new Date(e.end) >= from && new Date(e.start) <= to);
    return { events, source: "mock" };
  }
  const res = await calendarApi(auth).events.list({
    calendarId: "primary",
    timeMin: from.toISOString(),
    timeMax: to.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 100,
  });
  const events: CalendarEvent[] = (res.data.items ?? []).map((e) => ({
    id: e.id!,
    title: e.summary ?? "(no title)",
    start: e.start?.dateTime ?? `${e.start?.date}T00:00:00`,
    end: e.end?.dateTime ?? `${e.end?.date}T00:00:00`,
    location: e.location,
    meetLink: e.hangoutLink,
    allDay: !e.start?.dateTime,
  }));
  return { events, source: "google" };
}

export async function createEvent(userId: string, ev: { title: string; start: string; end: string; description?: string; location?: string }) {
  const auth = await getGoogleClient(userId);
  if (!auth) {
    return { id: `mock-${Date.now()}`, title: ev.title, start: ev.start, end: ev.end, location: ev.location } satisfies CalendarEvent;
  }
  const res = await calendarApi(auth).events.insert({
    calendarId: "primary",
    requestBody: {
      summary: ev.title,
      description: ev.description,
      location: ev.location,
      start: { dateTime: ev.start },
      end: { dateTime: ev.end },
    },
  });
  return { id: res.data.id!, title: ev.title, start: ev.start, end: ev.end, location: ev.location } satisfies CalendarEvent;
}

/** Free gaps between events within working hours of a given day. */
export function freeGaps(events: CalendarEvent[], dayStart: Date, dayEnd: Date, minMinutes = 30) {
  const busy = events
    .filter((e) => !e.allDay)
    .map((e) => ({ s: new Date(e.start).getTime(), e: new Date(e.end).getTime() }))
    .sort((a, b) => a.s - b.s);
  const gaps: { start: Date; end: Date; minutes: number }[] = [];
  let cursor = dayStart.getTime();
  for (const b of busy) {
    if (b.s > cursor) {
      const mins = (b.s - cursor) / 60_000;
      if (mins >= minMinutes) gaps.push({ start: new Date(cursor), end: new Date(b.s), minutes: Math.floor(mins) });
    }
    cursor = Math.max(cursor, b.e);
  }
  if (dayEnd.getTime() > cursor) {
    const mins = (dayEnd.getTime() - cursor) / 60_000;
    if (mins >= minMinutes) gaps.push({ start: new Date(cursor), end: dayEnd, minutes: Math.floor(mins) });
  }
  return gaps;
}
