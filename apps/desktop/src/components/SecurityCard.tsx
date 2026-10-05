/*apps/desktop/src/components/SecurityCard.tsx*/

import { useState } from "react";
import { changePasswordInputSchema } from "@chessbox/shared";
import { trpc, setAuthToken, signOut } from "../trpc";
import styles from "./SecurityCard.module.css";

// account security on the Settings page: change password, and sign out of every device

interface SecurityCardProps {
  onLogout: () => void;
}

export function SecurityCard({ onLogout }: SecurityCardProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const parsed = changePasswordInputSchema.safeParse({ currentPassword, newPassword });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    setSaving(true);
    try {
      // the server signs out every other session and hands this device a fresh token
      const { token } = await trpc.auth.changePassword.mutate(parsed.data);
      setAuthToken(token);
      await window.storage.saveAuthToken(token);

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Password changed. Any other devices have been signed out.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't change password");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOutEverywhere() {
    if (!window.confirm("Sign out of ChessBox on every device, including this one?")) return;

    setError(null);
    setSigningOut(true);
    try {
      await trpc.auth.logoutEverywhere.mutate();
      await signOut();
      onLogout();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't sign out of other devices");
      setSigningOut(false);
    }
  }

  return (
    <section className={styles.securityCard}>
      <h2 className={styles.title}>Security</h2>

      <form className={styles.form} onSubmit={handleChangePassword}>
        <span className={styles.sectionLabel}>Change Password</span>

        <input
          type="password"
          placeholder="Current password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        <input
          type="password"
          placeholder="New password (8+ characters)"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <input
          type="password"
          placeholder="Confirm new password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        {error && <p className={styles.error}>{error}</p>}
        {success && <p className={styles.success}>{success}</p>}

        <button type="submit" className={styles.primaryBtn} disabled={saving}>
          {saving ? "Saving..." : "Update Password"}
        </button>
      </form>

      <div className={styles.divider} />

      <div className={styles.signOutRow}>
        <div>
          <span className={styles.sectionLabel}>Sign Out Everywhere</span>
          <p className={styles.hint}>Ends every session, including this one. Use this if a device is lost.</p>
        </div>
        <button type="button" className={styles.dangerBtn} onClick={handleSignOutEverywhere} disabled={signingOut}>
          {signingOut ? "Signing out..." : "Sign Out All"}
        </button>
      </div>
    </section>
  );
}
