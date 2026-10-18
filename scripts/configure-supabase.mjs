// Applies Studesk's settings to supabase/config.toml after `supabase init`.
// Line-based and idempotent: sets keys inside their [section], uncommenting or adding them as needed.
//
// This file is read twice, by two different things. `supabase start` builds the local Docker stack from it,
// and `supabase config push` treats it as the settings a hosted project ought to have. So anything declared
// here for the benefit of local development is also an instruction to change staging. Three rules keep the
// two apart:
//
//   SETTINGS    what Arcoin genuinely controls, and wants identical everywhere.
//   UNDECLARED  what belongs to whoever runs the project. `config push` leaves undeclared keys alone, so
//               commenting them out is what stops a push touching them. Local keeps the CLI's defaults,
//               which are the same values these lines held.
//   REMOTES     the one kind of setting that must differ: right for local, wrong for hosted. A
//               [remotes.<name>] block whose project_id matches the linked project overrides SETTINGS for
//               that project only.
import {readFileSync, writeFileSync} from 'node:fs';

const FILE = process.argv[2] ?? 'supabase/config.toml';
const STAGING_REF = 'aiaxzemsbrsghlimfzpk'; // arcoin-staging, ap-south-1, org Arcoin

// Keys we must not declare, because declaring them means pushing them. Each was a Supabase CLI default that
// happened to disagree with the hosted project, so a push would have changed staging for no reason.
const UNDECLARED = {
  // Localhost has no business in a hosted project's redirect allow-list.
  'auth': ['additional_redirect_urls'],
  // Staging has TOTP enrolment on. The CLI's local default is off, and pushing that would disable it.
  'auth.mfa.totp': ['enroll_enabled', 'verify_enabled'],
  'auth.mfa.phone': ['enroll_enabled', 'verify_enabled'],
  // Connection capacity is the project's own business, not the app's.
  'db.pooler': ['default_pool_size', 'max_client_conn'],
  // Studesk stores no vectors. Pushing would switch the feature on.
  'storage.vector': ['enabled', 'max_buckets', 'max_indexes'],
};
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
// `[auth.email] max_frequency` stays at the CLI's "1s" so the end-to-end tests can ask for several codes in
// a row. Hosted must not inherit that — see REMOTES.

// Right for local, wrong for hosted. Overrides SETTINGS only while the linked project_id matches.
const REMOTES = {
  'remotes.staging': {project_id: `"${STAGING_REF}"`},
  // Local sends a code a second; a hosted project must make someone wait a minute, or a teammate's address
  // can be used to bomb their inbox with codes and leave every earlier code stale.
  'remotes.staging.auth.email': {max_frequency: '"1m0s"'},
};

let lines = readFileSync(FILE, 'utf8').split('\n');
const header = (s) => new RegExp(`^\\s*#?\\s*\\[${s.replace(/\./g, '\\.')}\\]\\s*$`);
const anyHeader = /^\s*#?\s*\[[^\]]+\]\s*$/;

// The span of lines belonging to a [section], or null when the file has no such header.
function sectionRange(section) {
  const start = lines.findIndex((l) => header(section).test(l));
  if (start === -1) return null;
  let end = lines.findIndex((l, i) => i > start && anyHeader.test(l));
  if (end === -1) end = lines.length;
  return {start, end};
}

for (const [section, keys] of Object.entries({...SETTINGS, ...REMOTES})) {
  let found = sectionRange(section);
  if (!found) {
    lines.push('', `[${section}]`);
    found = {start: lines.length - 1, end: lines.length};
  } else {
    lines[found.start] = `[${section}]`; // uncomment the header if it was commented out
  }
  let {start, end} = found;

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

// Comment out the keys Arcoin does not control, so a hosted push cannot carry them.
for (const [section, keys] of Object.entries(UNDECLARED)) {
  const found = sectionRange(section);
  if (!found) continue;
  for (const key of keys) {
    const keyRe = new RegExp(`^(\\s*)(${key}\\s*=.*)$`);
    for (let i = found.start + 1; i < found.end; i++) {
      const match = keyRe.exec(lines[i]);
      if (match) lines[i] = `${match[1]}# ${match[2]}`;
    }
  }
}

if (lines.at(-1) !== '') lines.push('');
writeFileSync(FILE, lines.join('\n'));
console.log(`✓ ${FILE} configured for Studesk`);
