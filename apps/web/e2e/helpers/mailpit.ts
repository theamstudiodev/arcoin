import {MAILPIT_API} from './local';

// Local Supabase delivers every email to Mailpit. https://mailpit.axllent.org/docs/api-v1/
type Address = {Name: string; Address: string};
type Summary = {ID: string; To: Address[]; Subject: string};
type Message = {ID: string; Subject: string; HTML: string; Text: string};

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${MAILPIT_API}${path}`);
  if (!response.ok) throw new Error(`Mailpit ${path} answered ${response.status}`);
  return (await response.json()) as T;
}

/** Messages addressed to `email`, newest first. */
async function messagesTo(email: string): Promise<Summary[]> {
  const {messages} = await get<{messages: Summary[]}>('/messages?limit=100');
  const wanted = email.toLowerCase();
  return messages.filter((message) => message.To.some((to) => to.Address.toLowerCase() === wanted));
}

/** The messages `email` already has. Take this before asking for a code, so an old code is never read. */
export async function mailpitIds(email: string): Promise<Set<string>> {
  return new Set((await messagesTo(email)).map((message) => message.ID));
}

/** Waits for a new sign-in email to `email` and reads the 6-digit code out of it. */
export async function waitForCode(
  email: string,
  ignore: Set<string>,
  timeoutMs = 15_000,
): Promise<{code: string; subject: string}> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const fresh = (await messagesTo(email)).find((message) => !ignore.has(message.ID));
    if (fresh) {
      const message = await get<Message>(`/message/${fresh.ID}`);
      const code = message.HTML.match(/>\s*(\d{6})\s*</)?.[1] ?? message.Text.match(/\b(\d{6})\b/)?.[1];
      if (!code) throw new Error(`No 6-digit code in the email to ${email}: "${message.Subject}"`);
      return {code, subject: message.Subject};
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`No sign-in email reached ${email} within ${timeoutMs / 1000} s`);
}
