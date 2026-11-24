/* apps/desktop/src/pages/Settings.tsx */

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@chessbox/shared/router';
import { trpc, setAuthToken, changePassword } from '../trpc';
import { accountError, newPasswordError } from '../account/forms';
import styles from './Settings.module.css';

// one page for the account (T18): who you are, linked chess sites, change username, change password

type Profile = inferRouterOutputs<AppRouter>['auth']['me'];
type Site = 'lichess' | 'chesscom';
type Note = { kind: 'ok' | 'error'; text: string } | null;

const SITES: { id: Site; label: string; field: 'lichessName' | 'chesscomName' }[] = [
  { id: 'lichess', label: 'Lichess', field: 'lichessName' },
  { id: 'chesscom', label: 'Chess.com', field: 'chesscomName' },
];

interface SettingsProps {
  onLogout: () => void;
  onUserChange: (user: Profile) => void;
}

const NoteLine = ({ note }: { note: Note }) =>
  note && <p className={note.kind === 'ok' ? styles.ok : styles.error} role={note.kind === 'error' ? 'alert' : 'status'}>{note.text}</p>;

function LinkedSite({ site, current, onLinked }: { site: (typeof SITES)[number]; current: string | null; onLinked: (name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const call = site.id === 'lichess' ? trpc.connections.connectLichess : trpc.connections.connectChesscom;
      const { username } = await call.mutate({ username: name });
      onLinked(username);
      setEditing(false);
      setNote({ kind: 'ok', text: `Linked to ${username}.` });
    } catch (err) {
      setNote({ kind: 'error', text: accountError(err, `Couldn't link ${site.label}.`) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.siteRow}>
      <span className={styles.label}>{site.label}</span>
      {editing ? (
        <form className={styles.inline} onSubmit={save}>
          <input
            className={styles.input}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={`Your ${site.label} username`}
            autoComplete="off"
            spellCheck={false}
            autoFocus
            required
          />
          <button className={`${styles.btn} ${styles.primary}`} disabled={busy || !name.trim()}>{busy ? 'Checking…' : 'Save'}</button>
          <button type="button" className={styles.btn} onClick={() => { setEditing(false); setNote(null); }}>Cancel</button>
        </form>
      ) : (
        <>
          <span className={current ? styles.value : styles.empty}>{current ?? 'Not linked'}</span>
          <button className={styles.btn} onClick={() => { setName(current ?? ''); setNote(null); setEditing(true); }}>
            {current ? 'Change' : 'Link'}
          </button>
        </>
      )}
      <NoteLine note={note} />
    </div>
  );
}

function ChangeUsername({ current, onChanged }: { current: string; onChanged: (username: string) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const result = await trpc.user.changeUsername.mutate({ password, newUsername: username.trim() });
      onChanged(result.username);
      setUsername('');
      setPassword('');
      setNote({ kind: 'ok', text: `You're now ${result.username}. Sign in with it next time.` });
    } catch (err) {
      setNote({ kind: 'error', text: accountError(err, "Couldn't change your username.") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <label className={styles.field}>
        <span className={styles.label}>New username</span>
        <input className={styles.input} value={username} onChange={e => setUsername(e.target.value)} placeholder={current} autoComplete="username" spellCheck={false} required />
      </label>
      <label className={styles.field}>
        <span className={styles.label}>Current password</span>
        <input className={styles.input} type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required />
      </label>
      <button className={`${styles.btn} ${styles.primary}`} disabled={busy || !username.trim() || !password}>{busy ? 'Saving…' : 'Change username'}</button>
      <NoteLine note={note} />
    </form>
  );
}

function ChangePassword() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const problem = newPasswordError(next, confirm);
    if (problem) return setNote({ kind: 'error', text: problem });

    setBusy(true);
    try {
      await changePassword({ currentPassword: current, newPassword: next });
      setCurrent('');
      setNext('');
      setConfirm('');
      setNote({ kind: 'ok', text: 'Password changed.' });
    } catch (err) {
      setNote({ kind: 'error', text: accountError(err, "Couldn't change your password.") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <label className={styles.field}>
        <span className={styles.label}>Current password</span>
        <input className={styles.input} type="password" value={current} onChange={e => setCurrent(e.target.value)} autoComplete="current-password" required />
      </label>
      <label className={styles.field}>
        <span className={styles.label}>New password</span>
        <input className={styles.input} type="password" value={next} onChange={e => setNext(e.target.value)} autoComplete="new-password" minLength={8} maxLength={64} required />
      </label>
      <label className={styles.field}>
        <span className={styles.label}>New password again</span>
        <input className={styles.input} type="password" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" required />
      </label>
      <button className={`${styles.btn} ${styles.primary}`} disabled={busy || !current || !next || !confirm}>{busy ? 'Saving…' : 'Change password'}</button>
      <NoteLine note={note} />
    </form>
  );
}

const Settings = ({ onLogout, onUserChange }: SettingsProps) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoadError(null);
    trpc.auth.me.query()
      .then(setProfile)
      .catch(err => setLoadError(accountError(err, "Couldn't load your account.")));
  }, []);
  useEffect(load, [load]);

  function update(patch: Partial<Profile>) {
    if (!profile) return;
    const next = { ...profile, ...patch };
    setProfile(next);
    onUserChange(next);
  }

  async function signOut() {
    setAuthToken(null);
    await window.storage.clearAuthToken();
    onLogout();
  }

  return (
    <main className={`main-content ${styles.page}`}>
      <h1 className={styles.title}>Settings</h1>

      {!profile ? (
        <section className={styles.section}>
          {loadError ? (
            <>
              <p className={styles.error} role="alert">{loadError}</p>
              <div className={styles.row}>
                <button className={styles.btn} onClick={load}>Retry</button>
                <button className={styles.btn} onClick={signOut}>Sign out</button>
              </div>
            </>
          ) : (
            <p className={styles.empty}>Loading your account…</p>
          )}
        </section>
      ) : (
        <>
          <section className={styles.section}>
            <h2 className={styles.heading}>Account</h2>
            <div className={styles.identity}>
              <div className={styles.avatar}>{profile.username.charAt(0).toUpperCase()}</div>
              <div>
                <p className={styles.name}>{profile.username}</p>
                <p className={styles.empty}>{profile.email}</p>
              </div>
              <button className={`${styles.btn} ${styles.push}`} onClick={signOut}>Sign out</button>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.heading}>Linked accounts</h2>
            <p className={styles.hint}>Used to import your games. ChessBox checks the account exists before saving it.</p>
            {SITES.map(site => (
              <LinkedSite key={site.id} site={site} current={profile[site.field]} onLinked={name => update({ [site.field]: name })} />
            ))}
          </section>

          <section className={styles.section}>
            <h2 className={styles.heading}>Change username</h2>
            <ChangeUsername current={profile.username} onChanged={username => update({ username })} />
          </section>

          <section className={styles.section}>
            <h2 className={styles.heading}>Change password</h2>
            <p className={styles.hint}>Other devices stay signed in until their login expires (up to 3 days).</p>
            <ChangePassword />
          </section>
        </>
      )}
    </main>
  );
};

export default Settings;
