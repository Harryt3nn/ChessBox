/* apps/desktop/src/pages/Profile.tsx */

import { useState, useEffect } from 'react';
import Sidebar from '../components/SidebarModule';
import { trpc, setAuthToken } from '../trpc';
import styles from './Profile.module.css';
import type { Page } from '../types/Page';

interface ProfileProps {
    page: Page;
    setPage: (page: Page) => void;
    onLogout: () => void;
    isAuthed: boolean;
}

interface ProfileData {
    id: string;
    username: string;
    email: string;
    lichessName: string | null;
    chesscomName: string | null;
}

const Profile = ({ page, setPage, onLogout, isAuthed }: ProfileProps) => {
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isAuthed) return;

        setLoading(true);
        trpc.auth.me.query()
            .then(setProfile)
            .catch(() => setProfile(null))
            .finally(() => setLoading(false));
    }, [isAuthed]);

    async function handleLogout() {
        setAuthToken(null);
        await window.storage.clearAuthToken();
        setProfile(null);
        onLogout();
    }

    return (
        <div className="app-layout">
            <Sidebar setPage={setPage} />

            <main className="main-content">



                <div className={styles.profileCard}>
                    {loading ? (
                        <p className={styles.loadingText}>Loading profile...</p>
                    ) : profile ? (
                        <>
                            <div className={styles.avatar}>
                                {profile.username.charAt(0).toUpperCase()}
                            </div>

                            <h2 className={styles.username}>{profile.username}</h2>
                            <p className={styles.email}>{profile.email}</p>

                            <div className={styles.connections}>
                                <div className={styles.connectionRow}>
                                    <span className={styles.connectionLabel}>Lichess</span>
                                    {profile.lichessName ? (
                                        <span className={styles.connectionValue}>{profile.lichessName}</span>
                                    ) : (
                                        <span className={styles.connectionEmpty}>Not connected</span>
                                    )}
                                </div>

                                <div className={styles.connectionRow}>
                                    <span className={styles.connectionLabel}>Chess.com</span>
                                    {profile.chesscomName ? (
                                        <span className={styles.connectionValue}>{profile.chesscomName}</span>
                                    ) : (
                                        <span className={styles.connectionEmpty}>Not connected</span>
                                    )}
                                </div>
                            </div>

                            <button className={styles.logoutBtn} onClick={handleLogout}>
                                Log Out
                            </button>
                        </>
                    ) : (
                        <p className={styles.loadingText}>Failed to load profile.</p>
                    )}
                </div>


            </main>
        </div>
    );
};

export default Profile