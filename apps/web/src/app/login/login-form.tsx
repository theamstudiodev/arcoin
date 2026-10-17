'use client';

import {REGEXP_ONLY_DIGITS} from 'input-otp';
import {type SubmitEvent, useRef, useState, useTransition} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {InputOTP, InputOTPGroup, InputOTPSlot} from '@/components/ui/input-otp';
import {Label} from '@/components/ui/label';
import {sendCode, verifyCode} from '@/lib/actions/auth';
import {sendCodeSchema, verifyCodeSchema} from '@/lib/schemas/auth';

const SLOTS = [0, 1, 2, 3, 4, 5];

// The card is dark (see page.tsx): labels in Plex Mono, errors in a red tint, secondary actions in pale blue-grey.
const LABEL = 'font-mono text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase';
const ALERT = 'rounded-md border border-red-400/30 bg-red-500/15 px-3 py-2 text-sm text-red-200';
const SECONDARY = 'h-11 px-2 text-muted-foreground hover:bg-muted hover:text-white';
// The shadcn hover fades the button into the navy card (olive); keep it solid lime and brighten it instead.
const PRIMARY = 'h-11 font-semibold hover:bg-primary hover:brightness-110';

/** Email first, then the 6-digit code from that email. The code is typed inside the app, so it works in an installed iPhone app too. */
export function LoginForm() {
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const codeInput = useRef<HTMLInputElement>(null);

  function requestCode(address: string, onSent: (email: string) => void) {
    const parsed = sendCodeSchema.safeParse({email: address});
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await sendCode(parsed.data);
      if (result.ok) onSent(result.data.email);
      else setError(result.error);
    });
  }

  function submitEmail(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    requestCode(email, (address) => {
      setSentTo(address);
      setCode('');
    });
  }

  function submitCode(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sentTo) return;
    const parsed = verifyCodeSchema.safeParse({email: sentTo, token: code});
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setError(null);
    setNotice(null);
    startTransition(async () => {
      // On success the action opens People and this never resolves with a result to show.
      const result = await verifyCode(parsed.data);
      if (result?.ok === false) {
        setError(result.error);
        // Empty boxes, ready for the right code: typing into six full boxes would only replace the last digit.
        setCode('');
        codeInput.current?.focus();
      }
    });
  }

  function resendCode() {
    if (!sentTo) return;
    requestCode(sentTo, () => {
      setCode('');
      setNotice('New code sent.');
    });
  }

  function changeEmail() {
    setSentTo(null);
    setCode('');
    setError(null);
    setNotice(null);
  }

  if (!sentTo) {
    return (
      <form onSubmit={submitEmail} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email" className={LABEL}>
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-11"
          />
          <p className="text-xs text-muted-foreground">We&apos;ll email you a 6-digit code.</p>
        </div>
        {error && (
          <p role="alert" className={ALERT}>
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending} className={PRIMARY}>
          {pending ? 'Sending…' : 'Send code'}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={submitCode} noValidate className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        Enter the 6-digit code sent to
        <span className="block font-medium text-white [overflow-wrap:anywhere]">{sentTo}</span>
      </p>
      <div className="flex flex-col gap-2">
        <Label htmlFor="code" className={LABEL}>
          Code
        </Label>
        <InputOTP
          ref={codeInput}
          id="code"
          autoFocus
          maxLength={6}
          pattern={REGEXP_ONLY_DIGITS}
          pasteTransformer={(pasted) => pasted.replace(/\D/g, '')}
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={setCode}
        >
          <InputOTPGroup className="gap-2">
            {SLOTS.map((index) => (
              <InputOTPSlot key={index} index={index} className="size-11 rounded-lg border font-mono text-xl md:size-12" />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>
      {error && (
        <p role="alert" className={ALERT}>
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-lime-500">
          {notice}
        </p>
      )}
      <Button type="submit" disabled={pending} className={PRIMARY}>
        {pending ? 'Checking…' : 'Sign in'}
      </Button>
      <div className="-mx-2 flex flex-wrap items-center justify-between gap-1">
        <Button type="button" variant="ghost" onClick={changeEmail} className={SECONDARY}>
          Use a different email
        </Button>
        <Button type="button" variant="ghost" onClick={resendCode} disabled={pending} className={SECONDARY}>
          Send a new code
        </Button>
      </div>
    </form>
  );
}
