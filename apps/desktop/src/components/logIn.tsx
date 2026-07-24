/*apps/desktop/src/components/logIn.tsx*/


import { useState } from "react";
import { usernameSchema, passwordSchema, emailSchema } from "@chessbox/shared";
import { trpc, setAuthToken } from '../trpc'
import styles from "./logIn.module.css";

type Mode = "login" | "register";

export function LogIn({ onSuccess }: { onSuccess: () => void }) {
  const [mode, setMode] = useState<Mode>("login");

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [errors, setErrors] = useState<{
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const usernameResult = usernameSchema.safeParse(username);
    const passwordResult = passwordSchema.safeParse(password);
    const newErrors: typeof errors = {};

    if (!usernameResult.success) {
      newErrors.username = usernameResult.error.issues[0].message;
    }
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.issues[0].message;
    }

    if (mode === "register") {
      const emailResult = emailSchema.safeParse(email);
      if (!emailResult.success) {
        newErrors.email = emailResult.error.issues[0].message;
      }
      if (password !== confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function toggleMode() {
    setMode(mode === "login" ? "register" : "login");
    setErrors({});
    setSubmitError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitError(null);
    setSubmitting(true);

    try {
      const result =
        mode === "login"
          ? await trpc.auth.login.mutate({ username, password })
          : await trpc.auth.register.mutate({ username, email, password });

      setAuthToken(result.token);
      await window.storage.saveAuthToken(result.token);
      onSuccess();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : `${mode === "login" ? "Login" : "Sign up"} failed`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalWindow}>
        <h2>{mode === "login" ? "Sign into ChessBox" : "Create your ChessBox account"}</h2>

        <form onSubmit={handleSubmit}>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            name="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          {errors.username && <p className={styles.error}>{errors.username}</p>}

          {mode === "register" && (
            <>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {errors.email && <p className={styles.error}>{errors.email}</p>}
            </>
          )}

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {errors.password && <p className={styles.error}>{errors.password}</p>}

          {mode === "register" && (
            <>
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              {errors.confirmPassword && <p className={styles.error}>{errors.confirmPassword}</p>}
            </>
          )}

          {submitError && <p className={styles.error}>{submitError}</p>}

          <button type="submit" disabled={submitting}>
            {submitting
              ? mode === "login" ? "Signing in..." : "Creating account..."
              : mode === "login" ? "Log In" : "Sign Up"}
          </button>
        </form>

        <button type="button" className={styles.modeToggle} onClick={toggleMode}>
          {mode === "login"
            ? "Don't have an account? Sign up"
            : "Already have an account? Log in"}
        </button>
      </div>
    </div>
  );
}