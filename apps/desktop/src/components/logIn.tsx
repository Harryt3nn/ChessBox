/*apps/desktop/src/components/logIn.tsx*/


import { useState } from "react";
import { usernameSchema, passwordSchema } from "@chessbox/shared";
import { trpc, setAuthToken } from '../trpc'
import styles from "./logIn.module.css";


export function LogIn({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
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

    setErrors(newErrors);

    return usernameResult.success && passwordResult.success;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitError(null);
    setSubmitting(true);

    try {
      const result = await trpc.auth.login.mutate({ username, password });
      setAuthToken(result.token);
      await window.storage.saveAuthToken(result.token);
      onSuccess();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalWindow}>
        <h2>Sign into ChessBox</h2>

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

          {submitError && <p className={styles.error}>{submitError}</p>}

          <button type="submit" disabled={submitting}>
            {submitting ? "Signing in..." : "Log In"}
          </button>
        </form>
      </div>
    </div>
  );
}