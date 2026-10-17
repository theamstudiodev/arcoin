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
      <form onSubmit={submitEmail} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
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
            className="h-11 md:h-9"
          />
          <p className="text-xs text-muted-foreground">We&apos;ll email you a 6-digit code.</p>
        </div>
        {error && <p role="alert">{error}</p>}
        <Button type="submit" disabled={pending} className="h-11 md:h-9">
          {pending ? 'Sending…' : 'Send code'}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={submitCode} noValidate className="flex flex-col gap-4">
      <p className="text-sm">
        Enter the 6-digit code sent to <span className="font-medium break-all">{sentTo}</span>.
      </p>
      <div className="flex flex-col gap-2">
        <Label htmlFor="code">Code</Label>
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
          <InputOTPGroup>
            {SLOTS.map((index) => (
              <InputOTPSlot key={index} index={index} className="size-11" />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <Button type="submit" disabled={pending} className="h-11 md:h-9">
        {pending ? 'Checking…' : 'Sign in'}
      </Button>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="ghost" onClick={changeEmail} className="h-11 md:h-9">
          Use a different email
        </Button>
        <Button type="button" variant="link" onClick={resendCode} disabled={pending} className="h-11 md:h-9">
          Send a new code
        </Button>
      </div>
    </form>
  );
}
