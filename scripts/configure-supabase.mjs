// Applies Studesk's settings to supabase/config.toml after `supabase init`.
// Line-based and idempotent: sets keys inside their [section], uncommenting or adding them as needed.
import {readFileSync, writeFileSync} from 'node:fs';

const FILE = process.argv[2] ?? 'supabase/config.toml';
const SETTINGS = {
  'db': {major_version: '17'},
  // Declared here, not left to the CLI's defaults, so `supabase config push` carries them to staging too.
  // Anonymous sign-ins would hand out sessions for free; manual linking lets an account attach another
  // identity to itself. Neither is wanted.
  'auth': {
    site_url: '"http://localhost:3000"',
    additional_redirect_urls: '["http://localhost:3000/**"]',
    minimum_password_length: '8',
    enable_anonymous_sign_ins: 'false',
    enable_manual_linking: 'false',
  },
  // Confirmation stays on: off, anyone who knows a teammate's email could sign up as them with a password.
  // double_confirm_changes is the dashboard's "Secure email change": without it, anyone holding a session
  // could move the account to an email of their own while the People row keeps pointing at it.
  'auth.email': {
    enable_signup: 'true',
    enable_confirmations: 'true',
    double_confirm_changes: 'true',
    otp_length: '6',
    otp_expiry: '600',
  },
  // A returning person's code comes in the magic link email, a brand-new account's in the confirmation email, and a
  // reset anyone asks Supabase for directly in the recovery email. All three carry the code, never a link.
  'auth.email.template.magic_link': {
    subject: '"Set your Arcoin password"',
    content_path: '"./supabase/templates/sign-in-code.html"',
  },
  'auth.email.template.confirmation': {
    subject: '"Set your Arcoin password"',
    content_path: '"./supabase/templates/sign-in-code.html"',
  },
  'auth.email.template.recovery': {
    subject: '"Set your Arcoin password"',
    content_path: '"./supabase/templates/sign-in-code.html"',
  },
};

let lines = readFileSync(FILE, 'utf8').split('\n');
const header = (s) => new RegExp(`^\\s*#?\\s*\\[${s.replace(/\./g, '\\.')}\\]\\s*$`);
const anyHeader = /^\s*#?\s*\[[^\]]+\]\s*$/;

for (const [section, keys] of Object.entries(SETTINGS)) {
  let start = lines.findIndex((l) => header(section).test(l));
  if (start === -1) {
    lines.push('', `[${section}]`);
    start = lines.length - 1;
  } else {
    lines[start] = `[${section}]`; // uncomment the header if it was commented out
  }
  let end = lines.findIndex((l, i) => i > start && anyHeader.test(l));
  if (end === -1) end = lines.length;

  for (const [key, value] of Object.entries(keys)) {
    const keyRe = new RegExp(`^\\s*#?\\s*${key}\\s*=`);
    const at = lines.slice(start + 1, end).findIndex((l) => keyRe.test(l));
    if (at === -1) {
      lines.splice(start + 1, 0, `${key} = ${value}`);
      end++;
    } else {
      lines[start + 1 + at] = `${key} = ${value}`;
    }
  }
}
writeFileSync(FILE, lines.join('\n'));
console.log(`✓ ${FILE} configured for Studesk`);
