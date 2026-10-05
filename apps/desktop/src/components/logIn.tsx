/*apps/desktop/src/components/logIn.tsx*/


import { useState } from "react";
import { usernameSchema, passwordSchema, emailSchema, emailCodeSchema } from "@chessbox/shared";
import { trpc, setAuthToken } from '../trpc'
import styles from "./logIn.module.css";
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@chessbox/shared/router';

type RouterOutput = inferRouterOutputs<AppRouter>;
type User = RouterOutput["auth"]["me"];

// login / register, plus the two-step forgotten password flow:
// "forgot" asks for the email, "reset" takes the emailed code and the new password
type Mode = "login" | "register" | "forgot" | "reset";

const TITLES: Record<Mode, string> = {
  login: "Sign into ChessBox",
  register: "Create your ChessBox account",
  forgot: "Reset your password",
  reset: "Choose a new password",
};

const SUBMIT_LABELS: Record<Mode, [idle: string, busy: string]> = {
  login: ["Log In", "Signing in..."],
  register: ["Sign Up", "Creating account..."],
  forgot: ["Send Code", "Sending..."],
  reset: ["Reset Password", "Resetting..."],
};

export function LogIn({ onSuccess }: { onSuccess: (user: User) => void }) {
  const [mode, setMode] = useState<Mode>("login");

  const [identifier, setIdentifier] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [errors, setErrors] = useState<{
    identifier?: string;
    username?: string;
    email?: string;
    code?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const newErrors: typeof errors = {};
    const check = (key: keyof typeof errors, result: { success: boolean; error?: { issues: { message: string }[] } }) => {
      if (!result.success) newErrors[key] = result.error!.issues[0].message;
    };

    if (mode === "login") {
      if (!identifier.trim()) newErrors.identifier = "Enter your username or email";
      if (!password) newErrors.password = "Enter your password";
    }

    if (mode === "register") {
      check("username", usernameSchema.safeParse(username));
      check("email", emailSchema.safeParse(email));
    }

    if (mode === "forgot" || mode === "reset") {
      check("email", emailSchema.safeParse(email));
    }

    if (mode === "reset") {
      check("code", emailCodeSchema.safeParse(code));
    }

    if (mode === "register" || mode === "reset") {
      check("password", passwordSchema.safeParse(password));
      if (password !== confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function switchMode(next: Mode, message: string | null = null) {
    setMode(next);
    setErrors({});
    setSubmitError(null);
    setNotice(message);
    setPassword("");
    setConfirmPassword("");
    if (next !== "reset") setCode("");
  }

  async function signIn(token: string) {
    setAuthToken(token);
    await window.storage.saveAuthToken(token);
    const user = await trpc.auth.me.query();
    onSuccess(user);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitError(null);
    setNotice(null);
    setSubmitting(true);

    try {
      if (mode === "login") {
        const result = await trpc.auth.login.mutate({ identifier, password });
        await signIn(result.token);
      }

      if (mode === "register") {
        const result = await trpc.auth.register.mutate({ username, email, password });
        await signIn(result.token);
      }

      if (mode === "forgot") {
        await trpc.auth.requestPasswordReset.mutate({ email });
        switchMode("reset", "If an account uses that email, a 6-digit code is on its way. It expires in 15 minutes.");
      }

      if (mode === "reset") {
        await trpc.auth.resetPassword.mutate({ email, code, newPassword: password });
        setIdentifier(email);
        switchMode("login", "Password reset. Sign in with your new password.");
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const showEmail = mode === "register" || mode === "forgot" || mode === "reset";
  const showPassword = mode !== "forgot";
  const showConfirm = mode === "register" || mode === "reset";

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalWindow}>
        <h2>{TITLES[mode]}</h2>

        {notice && <p className={styles.notice}>{notice}</p>}

        <form onSubmit={handleSubmit}>
          {mode === "login" && (
            <>
              <label htmlFor="identifier">Username or Email</label>
              <input
                id="identifier"
                type="text"
                name="identifier"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
              {errors.identifier && <p className={styles.error}>{errors.identifier}</p>}
            </>
          )}

          {mode === "register" && (
            <>
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                name="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              {errors.username && <p className={styles.error}>{errors.username}</p>}
            </>
          )}

          {showEmail && (
            <>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                readOnly={mode === "reset"}
                required
              />
              {errors.email && <p className={styles.error}>{errors.email}</p>}
            </>
          )}

          {mode === "reset" && (
            <>
              <label htmlFor="code">Code from your email</label>
              <input
                id="code"
                type="text"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                required
              />
              {errors.code && <p className={styles.error}>{errors.code}</p>}
            </>
          )}

          {showPassword && (
            <>
              <label htmlFor="password">{mode === "reset" ? "New Password" : "Password"}</label>
              <input
                id="password"
                type="password"
                name="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {errors.password && <p className={styles.error}>{errors.password}</p>}
            </>
          )}

          {showConfirm && (
            <>
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                name="confirmPassword"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              {errors.confirmPassword && <p className={styles.error}>{errors.confirmPassword}</p>}
            </>
          )}

          {submitError && <p className={styles.error}>{submitError}</p>}

          <button type="submit" disabled={submitting}>
            {SUBMIT_LABELS[mode][submitting ? 1 : 0]}
          </button>
        </form>

        {mode === "login" && (
          <>
            <button type="button" className={styles.modeToggle} onClick={() => switchMode("forgot")}>
              Forgot password?
            </button>
            <button type="button" className={styles.modeToggle} onClick={() => switchMode("register")}>
              Don't have an account? Sign up
            </button>
          </>
        )}

        {mode === "register" && (
          <button type="button" className={styles.modeToggle} onClick={() => switchMode("login")}>
            Already have an account? Log in
          </button>
        )}

        {mode === "reset" && (
          <button type="button" className={styles.modeToggle} onClick={() => switchMode("forgot")}>
            Didn't get a code? Send another
          </button>
        )}

        {(mode === "forgot" || mode === "reset") && (
          <button type="button" className={styles.modeToggle} onClick={() => switchMode("login")}>
            Back to sign in
          </button>
        )}
      </div>
    </div>
  );
}
