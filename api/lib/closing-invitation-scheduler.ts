import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const SEND_AT = Date.UTC(2026, 7, 22, 7, 0, 0); // 08:00 in Morocco (UTC+1).
const PRIVATE_STORAGE = join(process.cwd(), "storage", "private", "uploads");
const CAMPAIGN_VERSION = "v2-malaki";
const SENT_MARKER = join(PRIVATE_STORAGE, `.closing-ceremony-invitation-${CAMPAIGN_VERSION}-sent`);
const REPORT_PATH = join(PRIVATE_STORAGE, `closing-ceremony-email-report-${CAMPAIGN_VERSION}.csv`);

function runCampaign() {
  if (existsSync(SENT_MARKER)) {
    console.log("[Closing invitation] Campaign already completed; skipping.");
    return;
  }

  console.log("[Closing invitation] Starting scheduled campaign.");
  const child = spawn(
    process.execPath,
    [join(process.cwd(), "dist", "send-closing-ceremony-invitation.js"), "--send-all"],
    {
      env: {
        ...process.env,
        CLOSING_INVITATION_REPORT_PATH: REPORT_PATH,
        CLOSING_INVITATION_SENT_MARKER: SENT_MARKER,
      },
      stdio: "inherit",
    },
  );
  child.on("error", (error) => console.error("[Closing invitation] Failed to start:", error));
  child.on("exit", (code) => console.log(`[Closing invitation] Campaign exited with code ${code}.`));
}

export function startClosingInvitationScheduler() {
  if (existsSync(SENT_MARKER)) return;
  const delay = Math.max(5_000, SEND_AT - Date.now());
  console.log(`[Closing invitation] Scheduled for ${new Date(SEND_AT).toISOString()}.`);
  const timer = setTimeout(runCampaign, delay);
  timer.unref();
}
