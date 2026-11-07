import React from 'react';

export default function AppHeader({ user, pageTitle, onHome, onLogout, level }) {
    return (
        <header className={`lobby-topbar app-topbar${pageTitle ? ' lobby-subpage-topbar' : ''}`}>
            <div className="lobby-wordmark">
                <img src="/icons/hive.png" alt="" />
                <span>GO BEE</span>
            </div>
            {pageTitle && <h1 className="app-topbar-title">{pageTitle}</h1>}
            <div className="lobby-profile">
                <span className="lobby-player-name">{user?.username || 'Player'}</span>
                <span className="lobby-rating"><img src="/icons/trophy.png" alt="" />{level ?? user?.level ?? '—'}</span>
            </div>
            {onLogout ? (
                <button className="lobby-logout" onClick={onLogout}>Sign out</button>
            ) : (
                <button className="lobby-logout app-home-button" onClick={onHome}>Home</button>
            )}
        </header>
    );
}
