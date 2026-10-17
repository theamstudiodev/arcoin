import {redirect} from 'next/navigation';
import {LoginForm} from '@/app/login/login-form';
import {NOT_ON_TEAM} from '@/lib/auth-errors';
import {APP_NAME} from '@/lib/brand';
import {getViewer} from '@/lib/me';

// Re-themes the shadcn parts for the dark card: a lime main button with navy text, lime focus rings, pale borders.
const CARD_TOKENS =
  '[--primary:#A3E635] [--primary-foreground:#081C33] [--ring:#A3E635] [--input:rgba(201,214,229,0.22)] ' +
  '[--border:rgba(201,214,229,0.22)] [--foreground:#FFFFFF] [--muted-foreground:#C9D6E5] [--muted:rgba(201,214,229,0.08)]';

// L-shaped crop marks just outside the card's corners, like the corners of a drawing sheet.
const MARK = 'pointer-events-none absolute size-[26px] border-lime-500/45';

export default async function LoginPage() {
  // Signed in and on the team: straight to work. Signed in but no longer on the team: say so here, rather than send
  // them round between the two screens. If the lookup itself fails, show the form; signing in reports its own errors.
  const viewer = await getViewer().catch(() => null);
  if (viewer?.me) redirect('/people');

  return (
    <main className="bg-blueprint flex min-h-dvh flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="relative w-full max-w-sm">
        <span aria-hidden className={`${MARK} -top-2 -left-2 border-t-[1.5px] border-l-[1.5px]`} />
        <span aria-hidden className={`${MARK} -top-2 -right-2 border-t-[1.5px] border-r-[1.5px]`} />
        <span aria-hidden className={`${MARK} -bottom-2 -left-2 border-b-[1.5px] border-l-[1.5px]`} />
        <span aria-hidden className={`${MARK} -right-2 -bottom-2 border-r-[1.5px] border-b-[1.5px]`} />

        <div
          className={`${CARD_TOKENS} rounded-lg border border-[rgba(201,214,229,0.22)] bg-navy-800/80 p-6 text-white backdrop-blur-md`}
        >
          <h1 className="mb-7 flex items-center gap-2.5 text-[28px] leading-none font-extrabold tracking-tight">
            <span aria-hidden className="size-4 rounded-[3px] bg-lime-500" />
            {APP_NAME}
          </h1>
          <LoginForm refusal={viewer?.signedIn ? NOT_ON_TEAM : undefined} />
        </div>
      </div>
    </main>
  );
}
