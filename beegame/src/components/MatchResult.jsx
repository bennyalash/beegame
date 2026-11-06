import React from 'react';

export default function MatchResult({ winner, winType, didWin = null, ratingDelta = null, onExit }) {
    const result = didWin === null ? 'neutral' : didWin ? 'win' : 'loss';
    const title = didWin === null ? `${winner} wins` : didWin ? 'Victory' : 'Match over';
    const summary = didWin === null
        ? 'The hive has a new champion.'
        : didWin
            ? 'You outplayed your opponent.'
            : 'Your opponent takes this one.';
    const numericDelta = ratingDelta == null || ratingDelta === '' ? null : Number(ratingDelta);
    const delta = numericDelta !== null && Number.isFinite(numericDelta) ? numericDelta : null;

    return (
        <div className="match-result-backdrop">
            <section className={`match-result-card result-${result}`} role="dialog" aria-modal="true" aria-labelledby="match-result-title">
                <span className="match-result-kicker">Match complete</span>
                <img className="match-result-bee" src={`/icons/bees/queen_${winner?.toLowerCase() || 'red'}.png`} alt="" />
                <h1 id="match-result-title">{title}</h1>
                <p className="match-result-summary">{summary}</p>
                <p className="match-result-winner">{winner} takes the hive{winType ? ` · ${winType}` : ''}</p>
                {delta !== null && <div className={`match-rating-change ${delta >= 0 ? 'rating-up' : 'rating-down'}`}>
                    <img src="/icons/trophy.png" alt="" />
                    <span>{delta > 0 ? '+' : ''}{delta}</span>
                    <small>rating</small>
                </div>}
                <button className="match-result-action" onClick={onExit}>Back to lobby</button>
            </section>
        </div>
    );
}
