type SendEmail = (message: { to: string; subject: string; text: string }) => Promise<void>;

// Resolve the active instance settings for each delivery, never cache a rotated key.
export function createEmailSender(
  load: () => Promise<{ apiKey: string; from: string } | null>,
): SendEmail {
  return async (message) => {
    const settings = await load();
    if (!settings) return;
    const { apiKey, from } = settings;
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, ...message }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Auth mail delivery failed (${response.status}).`);
  };
}
