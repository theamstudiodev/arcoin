'use client';

import {REGEXP_ONLY_DIGITS} from 'input-otp';
import {type SubmitEvent, useRef, useState, useTransition} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {InputOTP, InputOTPGroup, InputOTPSlot} from '@/components/ui/input-otp';
import {Label} from '@/components/ui/label';
import {sendCode, setPassword, signIn} from '@/lib/actions/auth';
import {sendCodeSchema, setPasswordSchema, signInSchema} from '@/lib/schemas/auth';

const SLOTS = [0, 1, 2, 3, 4, 5];

// The card is dark (see page.tsx): labels in Plex Mono, errors in a red tint, secondary actions in pale blue-grey.
const LABEL = 'font-mono text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase';
const ALERT = 'rounded-md border border-red-400/30 bg-red-500/15 px-3 py-2 text-sm text-red-200';
const SECONDARY = 'h-11 px-2 text-muted-foreground hover:bg-muted hover:text-white';
// The shadcn hover fades the button into the navy card (olive); keep it solid lime and brighten it instead.
const PRIMARY = 'h-11 font-semibold hover:bg-primary hover:brightness-110';

type Mode = 'sign-in' | 'set-password';

/**
 * Day to day: email and password. The first password, or a new one when it's forgotten, is set with a 6-digit code
 * from an email, typed here in the app, so it works in an installed iPhone app too.
 */
export function LoginForm({refusal}: {refusal?: string}) {
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPasswordText] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(refusal ?? null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const codeInput = useRef<HTMLInputElement>(null);

  function switchTo(next: Mode) {
    setMode(next);
    setSentTo(null);
    setCode('');
    setPasswordText('');
    setError(null);
    setNotice(null);
  }

  function submitSignIn(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = signInSchema.safeParse({email, password});
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setError(null);
    startTransition(async () => {
      // On success the action opens People and there is no result to show.
      const result = await signIn(parsed.data);
      if (result?.ok === false) setError(result.error);
    });
  }

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

  function submitNewPassword(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sentTo) return;
    const parsed = setPasswordSchema.safeParse({email: sentTo, token: code, password});
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await setPassword(parsed.data);
      if (result?.ok === false) {
        setError(result.error);
        if (result.fieldErrors?.token) {
          // Empty boxes, ready for the right code: typing into six full boxes would only replace the last digit.
          setCode('');
          codeInput.current?.focus();
        }
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

  const messages = (
    <>
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
    </>
  );

  const emailField = (
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
    </div>
  );

  function passwordField(id: string, label: string, autoComplete: string) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={id} className={LABEL}>
            {label}
          </Label>
          <button
            type="button"
            onClick={() => setShowPassword((shown) => !shown)}
            aria-controls={id}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className={`${LABEL} -my-2 px-1 py-2 hover:text-white`}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
        <Input
          id={id}
          name={id}
          type={showPassword ? 'text' : 'password'}
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          value={password}
          onChange={(event) => setPasswordText(event.target.value)}
          className="h-11"
        />
      </div>
    );
  }

  const backToSignIn = (
    <button
      type="button"
      onClick={() => switchTo('sign-in')}
      className="self-center px-2 py-2 text-sm text-muted-foreground hover:text-white"
    >
      Back to sign in
    </button>
  );

  if (mode === 'sign-in') {
    return (
      <form onSubmit={submitSignIn} noValidate className="flex flex-col gap-5">
        {emailField}
        {passwordField('password', 'Password', 'current-password')}
        {messages}
        <Button type="submit" disabled={pending} className={PRIMARY}>
          {pending ? 'Signing in…' : 'Sign in'}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          New here or forgot your password?{' '}
          <button
            type="button"
            onClick={() => switchTo('set-password')}
            className="font-medium text-lime-500 underline-offset-4 hover:underline"
          >
            Set a password
          </button>
        </p>
      </form>
    );
  }

  if (!sentTo) {
    return (
      <form onSubmit={submitEmail} noValidate className="flex flex-col gap-5">
        <div>
          <h2 className="text-lg font-semibold">Set a password</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your first password, or a new one if you&apos;ve forgotten it. We&apos;ll email you a 6-digit code to
            confirm it&apos;s you.
          </p>
        </div>
        {emailField}
        {messages}
        <Button type="submit" disabled={pending} className={PRIMARY}>
          {pending ? 'Sending…' : 'Send code'}
        </Button>
        {backToSignIn}
      </form>
    );
  }

  return (
    <form onSubmit={submitNewPassword} noValidate className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold">Set a password</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the 6-digit code sent to
          <span className="block font-medium text-white [overflow-wrap:anywhere]">{sentTo}</span>
        </p>
      </div>
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
      <div className="flex flex-col gap-2">
        {passwordField('new-password', 'New password', 'new-password')}
        <p className="text-xs text-muted-foreground">At least 8 characters.</p>
      </div>
      {messages}
      <Button type="submit" disabled={pending} className={PRIMARY}>
        {pending ? 'Saving…' : 'Set password'}
      </Button>
      <div className="-mx-2 flex flex-wrap items-center justify-between gap-1">
        <Button type="button" variant="ghost" onClick={changeEmail} className={SECONDARY}>
          Use a different email
        </Button>
        <Button type="button" variant="ghost" onClick={resendCode} disabled={pending} className={SECONDARY}>
          Send a new code
        </Button>
      </div>
      {backToSignIn}
    </form>
  );
}
