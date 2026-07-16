function isLocalHttpUrl(value: string | undefined) {
  if (!value) return false;

  try {
    const url = new URL(value);
    return (
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "::1"].includes(url.hostname)
    );
  } catch {
    return false;
  }
}

export function secureCookieSuffix() {
  // The production Docker image is also used for local testing. Browsers reject
  // Secure cookies over plain HTTP, so only loopback URLs may omit the flag.
  if (isLocalHttpUrl(process.env.APP_URL)) return "";

  const mustUseSecureCookies =
    process.env.NODE_ENV === "production" ||
    process.env.APP_URL?.startsWith("https://");
  return mustUseSecureCookies ? "; Secure" : "";
}
