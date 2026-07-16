import crypto from "node:crypto";
import { getSqlPool } from "../queries/connection";

const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const CONNECTION_ID = 1;

function oauthConfig() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID?.trim() || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET?.trim() || "",
    redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim() || "",
    calendarId: process.env.GOOGLE_CALENDAR_ID?.trim() || "primary",
  };
}

export function isGoogleCalendarConfigured() {
  const config = oauthConfig();
  return !!(config.clientId && config.clientSecret && config.redirectUri);
}

function requireOAuthConfig() {
  const config = oauthConfig();
  if (!config.clientId || !config.clientSecret || !config.redirectUri) {
    throw new Error("Google Calendar OAuth is not configured on the server.");
  }
  return config;
}

function encryptionKey() {
  const secret = process.env.APP_SECRET;
  if (!secret) throw new Error("APP_SECRET is required");
  return crypto.createHash("sha256").update(secret).digest();
}

function encryptToken(token: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".");
}

function decryptToken(payload: string) {
  const parts = payload.split(".");
  if (parts.length !== 3) throw new Error("Invalid encrypted Google token");
  const [iv, tag, encrypted] = parts.map((part) => Buffer.from(part, "base64url"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function buildGoogleAuthorizationUrl(state: string) {
  const config = requireOAuthConfig();
  const query = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: GOOGLE_CALENDAR_SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${query.toString()}`;
}

export async function exchangeGoogleAuthorizationCode(code: string) {
  const config = requireOAuthConfig();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const data = await response.json() as { refresh_token?: string; error?: string; error_description?: string };
  if (!response.ok || !data.refresh_token) {
    throw new Error(data.error_description || data.error || "Google did not return a refresh token.");
  }
  return data.refresh_token;
}

export async function saveGoogleCalendarConnection(refreshToken: string, adminId: number) {
  await getSqlPool().query(
    `INSERT INTO google_calendar_connections
      (id, encryptedRefreshToken, connectedByAdminId)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE
      encryptedRefreshToken = VALUES(encryptedRefreshToken),
      connectedByAdminId = VALUES(connectedByAdminId),
      updatedAt = CURRENT_TIMESTAMP`,
    [CONNECTION_ID, encryptToken(refreshToken), adminId],
  );
}

export async function getGoogleCalendarConnectionStatus() {
  if (!isGoogleCalendarConfigured()) return { configured: false, connected: false };
  const [rows] = await getSqlPool().query<any[]>(
    "SELECT id, updatedAt FROM google_calendar_connections WHERE id = ? LIMIT 1",
    [CONNECTION_ID],
  );
  if (!rows[0]) return { configured: true, connected: false, updatedAt: null };
  try {
    await getAccessToken();
    return { configured: true, connected: true, updatedAt: rows[0].updatedAt };
  } catch {
    return { configured: true, connected: false, needsReconnect: true, updatedAt: rows[0].updatedAt };
  }
}

export async function disconnectGoogleCalendarConnection() {
  let revoked = false;
  try {
    const refreshToken = await getRefreshToken();
    const response = await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: refreshToken }),
    });
    revoked = response.ok;
  } catch {
    // Local deletion still prevents the application from using the connection.
  }
  await getSqlPool().query("DELETE FROM google_calendar_connections WHERE id = ?", [CONNECTION_ID]);
  return { success: true, revoked };
}

async function getRefreshToken() {
  const [rows] = await getSqlPool().query<any[]>(
    "SELECT encryptedRefreshToken FROM google_calendar_connections WHERE id = ? LIMIT 1",
    [CONNECTION_ID],
  );
  if (!rows[0]?.encryptedRefreshToken) {
    throw new Error("Google Calendar is not connected.");
  }
  return decryptToken(rows[0].encryptedRefreshToken);
}

async function getAccessToken() {
  const config = requireOAuthConfig();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: await getRefreshToken(),
      grant_type: "refresh_token",
    }),
  });
  const data = await response.json() as { access_token?: string; error?: string; error_description?: string };
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "Unable to refresh Google access token.");
  }
  return data.access_token;
}

async function googleCalendarRequest(path: string, init?: RequestInit) {
  const response = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${await getAccessToken()}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google Calendar request failed (${response.status}): ${body.slice(0, 300)}`);
  }
  if (response.status === 204) return null;
  return response.json() as Promise<any>;
}

export async function createGoogleMeetEvent(input: {
  startTime: Date;
  endTime: Date;
  interviewerName?: string;
  notes?: string;
}) {
  const config = requireOAuthConfig();
  const calendarId = encodeURIComponent(config.calendarId);
  const event = await googleCalendarRequest(
    `/calendars/${calendarId}/events?conferenceDataVersion=1&sendUpdates=none`,
    {
      method: "POST",
      body: JSON.stringify({
        summary: "Entretien oral - Future Leaders Foundation",
        description: [input.interviewerName ? `Jury : ${input.interviewerName}` : "", input.notes || ""]
          .filter(Boolean)
          .join("\n"),
        start: { dateTime: input.startTime.toISOString() },
        end: { dateTime: input.endTime.toISOString() },
        conferenceData: {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      }),
    },
  );

  let currentEvent = event;
  for (let attempt = 0; attempt < 6 && !currentEvent?.hangoutLink; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    currentEvent = await googleCalendarRequest(`/calendars/${calendarId}/events/${encodeURIComponent(event.id)}`);
  }
  if (!currentEvent?.id || !currentEvent?.hangoutLink) {
    if (event?.id) {
      await googleCalendarRequest(`/calendars/${calendarId}/events/${encodeURIComponent(event.id)}`, { method: "DELETE" }).catch(() => null);
    }
    throw new Error("Google Calendar did not generate a Meet link.");
  }
  return { eventId: currentEvent.id as string, meetingUrl: currentEvent.hangoutLink as string };
}

export async function inviteCandidateToGoogleEvent(eventId: string, candidateEmail: string) {
  await setCandidateAttendance(eventId, candidateEmail, true);
}

async function setCandidateAttendance(eventId: string, candidateEmail: string, attending: boolean) {
  const calendarId = encodeURIComponent(requireOAuthConfig().calendarId);
  const path = `/calendars/${calendarId}/events/${encodeURIComponent(eventId)}`;
  const event = await googleCalendarRequest(path);
  const normalizedEmail = candidateEmail.trim().toLowerCase();
  const attendees = Array.isArray(event?.attendees)
    ? event.attendees.filter((attendee: { email?: string }) => attendee.email?.trim().toLowerCase() !== normalizedEmail)
    : [];
  if (attending) attendees.push({ email: candidateEmail });
  await googleCalendarRequest(
    `${path}?sendUpdates=all`,
    {
      method: "PATCH",
      body: JSON.stringify({ attendees }),
    },
  );
}

export async function removeCandidateFromGoogleEvent(eventId: string, candidateEmail: string) {
  await setCandidateAttendance(eventId, candidateEmail, false);
}

export async function deleteGoogleCalendarEvent(eventId: string) {
  const calendarId = encodeURIComponent(requireOAuthConfig().calendarId);
  try {
    await googleCalendarRequest(`/calendars/${calendarId}/events/${encodeURIComponent(eventId)}?sendUpdates=all`, {
      method: "DELETE",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("(404)") || message.includes("(410)")) return;
    throw error;
  }
}
