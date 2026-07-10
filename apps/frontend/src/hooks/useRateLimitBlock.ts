import { useEffect, useMemo, useState } from "react";

function getRetryAfterSeconds(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const match = message.match(/\[retry_after=(\d+)\]/);
  return match ? Number(match[1]) : 0;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error ?? "");
}

export function formatBlockedSeconds(totalSeconds: number) {
  const seconds = Math.max(0, Math.ceil(totalSeconds));
  const minutesPart = Math.floor(seconds / 60);
  const secondsPart = seconds % 60;

  if (minutesPart <= 0) {
    return `${secondsPart}s`;
  }

  return `${minutesPart}min ${secondsPart.toString().padStart(2, "0")}s`;
}

export function formatRateLimitError(error: unknown, fallbackMessage = "Trop de tentatives.") {
  const retryAfterSeconds = getRetryAfterSeconds(error);
  const rawMessage = getErrorMessage(error)
    .replace(/\s*\[retry_after=\d+\]\s*/g, "")
    .replace(/\s*Réessayez dans \d+ secondes\.?/gi, "")
    .trim();

  if (!retryAfterSeconds) {
    return rawMessage || fallbackMessage;
  }

  return `${rawMessage || fallbackMessage} Réessayez dans ${formatBlockedSeconds(retryAfterSeconds)}.`;
}

export function useRateLimitBlock() {
  const [blockedUntil, setBlockedUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const blockedSeconds = Math.max(0, Math.ceil((blockedUntil - now) / 1000));

  useEffect(() => {
    if (blockedSeconds <= 0) return;

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [blockedSeconds]);

  return useMemo(
    () => ({
      blockedSeconds,
      blockFromError(error: unknown) {
        const retryAfterSeconds = getRetryAfterSeconds(error);
        if (!retryAfterSeconds) return null;

        setNow(Date.now());
        setBlockedUntil(Date.now() + retryAfterSeconds * 1000);
        return formatRateLimitError(error);
      },
      clearBlock() {
        setBlockedUntil(0);
      },
    }),
    [blockedSeconds],
  );
}
