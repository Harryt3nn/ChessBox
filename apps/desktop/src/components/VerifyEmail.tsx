/*apps/desktop/src/components/VerifyEmail.tsx*/

import { useState } from "react";
import { emailCodeSchema } from "@chessbox/shared";
import { trpc } from "../trpc";
import styles from "./logIn.module.css";

// shown over the app after sign up (or for any signed-in account whose email isn't verified yet)
// the server emails a 6-digit code on registration; "Send a new code" requests another

interface VerifyEmailProps {
  email: string;
  onVerified: () => void;
  onLogout: () => void;
}

export function VerifyEmail({ email, onVerified, onLogout }: VerifyEmailProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);

    const parsed = emailCodeSchema.safeParse(code);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await trpc.auth.verifyEmail.mutate({ code: parsed.data });
      onVerified();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setError(null);
    setNotice(null);
    setResending(true);
    try {
      await trpc.auth.resendVerification.mutate();
      setNotice("A new code is on its way. Any earlier code no longer works.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send a new code");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalWindow}>
        <h2>Verify your email</h2>

        <p className={styles.lead}>
          We sent a 6-digit code to <strong>{email}</strong>. Enter it below to finish setting up your account.
        </p>

        {notice && <p className={styles.notice}>{notice}</p>}

        <form onSubmit={handleSubmit}>
          <label htmlFor="verify-code">Verification Code</label>
          <input
            id="verify-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            autoFocus
          />

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" disabled={submitting}>
            {submitting ? "Verifying..." : "Verify Email"}
          </button>
        </form>

        <button type="button" className={styles.modeToggle} onClick={handleResend} disabled={resending}>
          {resending ? "Sending..." : "Didn't get it? Send a new code"}
        </button>
        <button type="button" className={styles.modeToggle} onClick={onLogout}>
          Use a different account
        </button>
      </div>
    </div>
  );
}
