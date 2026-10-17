// Applies Studesk's settings to supabase/config.toml after `supabase init`.
// Line-based and idempotent: sets keys inside their [section], uncommenting or adding them as needed.
import {readFileSync, writeFileSync} from 'node:fs';

const FILE = process.argv[2] ?? 'supabase/config.toml';
const SETTINGS = {
  'db': {major_version: '17'},
  'auth': {
    site_url: '"http://localhost:3000"',
    additional_redirect_urls: '["http://localhost:3000/**"]',
    minimum_password_length: '8',
  },
  'auth.email': {enable_signup: 'true', otp_length: '6', otp_expiry: '600'},
  'auth.email.template.magic_link': {
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
