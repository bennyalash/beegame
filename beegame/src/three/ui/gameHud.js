import * as THREE from 'three';
import { createScenePanel } from './scenePanel.js';

function removePanels(group) {
    for (const child of [...group.children]) {
        group.remove(child);
        child.traverse((object) => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                const materials = Array.isArray(object.material) ? object.material : [object.material];
                materials.forEach((material) => {
                    material.map?.dispose();
                    material.dispose();
                });
            }
        });
    }
}

function addPanel(group, targets, options, x, y, z = 0.1) {
    const panel = createScenePanel(options);
    panel.position.set(x, y, z);
    group.add(panel);
    if (panel.userData.interactive) targets.push(panel);
    return panel;
}

function addBlocker(group, targets, width, height, z) {
    const blocker = new THREE.Mesh(
        new THREE.PlaneGeometry(width, height),
        new THREE.MeshBasicMaterial({ color: '#07111b', transparent: true, opacity: 0.74, depthTest: false, toneMapped: false }),
    );
    blocker.position.set(0, 0, z);
    blocker.userData.action = 'noop';
    blocker.userData.interactive = true;
    group.add(blocker);
    targets.push(blocker);
}

function getHands(props) {
    const { mode, player = 1, turn = 1, cards1 = [], cards2 = [] } = props;
    if (mode === 'online') {
        return player === 1
            ? { top: cards2, bottom: cards1, canPlay: turn === player }
            : { top: cards1, bottom: cards2, canPlay: turn === player };
    }
    if (mode === 'ai') return { top: cards2, bottom: cards1, canPlay: turn === 1 };
    return turn === 1
        ? { top: cards2, bottom: cards1, canPlay: true }
        : { top: cards1, bottom: cards2, canPlay: true };
}

export function buildGameHud(group, props, aspect, viewHeight) {
    removePanels(group);
    const targets = [];
    const viewWidth = aspect * viewHeight;
    const mobile = aspect < 0.9 || viewWidth < 10.5;
    const topY = viewHeight / 2 - (mobile ? 1.18 : 0.58);
    const bottomY = -viewHeight / 2 + (mobile ? 1.45 : 0.62);
    const fullWidth = Math.max(5.6, viewWidth - 0.32);
    const mode = props.mode || 'local';
    const turnLabel = mode === 'online'
        ? (props.turn === props.player ? 'YOUR TURN' : "OPPONENT'S TURN")
        : mode === 'ai'
            ? (props.turn === 1 ? 'YOUR TURN' : 'AI THINKING')
            : `PLAYER ${props.turn}'S TURN`;
    const sideColor = props.turn === 1 ? '#d96055' : '#5297cd';

    addPanel(group, targets, {
        width: fullWidth,
        height: 0.78,
        title: 'GO BEE',
        subtitle: mode === 'online' ? 'ONLINE MATCH' : mode === 'ai' ? 'AI CHALLENGE' : 'LOCAL TABLE',
        accent: '#d5a849',
    }, 0, topY, 0.03);

    addPanel(group, targets, {
        width: mobile ? 1.35 : 1.9,
        height: 0.52,
        title: mode === 'online' ? 'GAMES' : 'LEAVE',
        kind: 'button',
        action: mode === 'online' ? 'exitMatch' : 'openMenu',
        accent: '#647f8e',
    }, -viewWidth / 2 + (mobile ? 0.82 : 1.22), topY, 0.2);

    addPanel(group, targets, {
        width: mobile ? 2.45 : 3.4,
        height: 0.58,
        title: turnLabel,
        subtitle: props.menuOpen ? 'MATCH PAUSED' : props.isConfirming ? 'MOVE READY TO CONFIRM' : mode === 'local' ? 'ACTIVE PLAYER VIEW' : 'YOUR VIEW STAYS STEADY',
        accent: sideColor,
    }, 0, topY, 0.2);

    addPanel(group, targets, {
        width: mobile ? 1.35 : 1.9,
        height: 0.52,
        title: 'MENU',
        kind: 'button',
        action: 'openMenu',
        accent: '#d2a746',
    }, viewWidth / 2 - (mobile ? 0.82 : 1.22), topY, 0.2);

    const hands = getHands(props);
    const cardHeight = mobile ? 1.18 : 1.35;
    const topCardWidth = mobile ? 1.42 : 1.62;
    const bottomCardWidth = mobile ? 1.5 : 1.72;
    const gap = mobile ? 0.13 : 0.18;
    const topCards = (hands.top || []).slice(0, 2);
    const bottomCards = (hands.bottom || []).slice(0, 2);
    const topCenter = viewWidth > 12 ? -viewWidth * 0.16 : 0;
    const bottomCenter = viewWidth > 12 ? -viewWidth * 0.08 : 0;
    const topRowY = viewHeight / 2 - (mobile ? 2.85 : 2.55);
    const bottomRowY = bottomY + (mobile ? 1.82 : 1.68);

    addPanel(group, targets, {
        width: mobile ? 2.0 : 2.55,
        height: 0.46,
        title: props.mode === 'ai' ? 'HIVE RIVAL' : (props.topPlayerName || 'OPPONENT'),
        subtitle: props.mode === 'online' ? `RATING ${props.topPlayerLevel ?? '—'}` : 'RIVAL HAND',
        accent: props.turn === 1 ? '#599ac6' : '#d76658',
    }, topCenter, topRowY + 0.88, 0.11);

    topCards.forEach((card, index) => {
        const x = topCenter + (index - (topCards.length - 1) / 2) * (topCardWidth + gap);
        addPanel(group, targets, {
            width: topCardWidth,
            height: cardHeight,
            title: card?.name || 'MOVE',
            moves: card?.moves || [],
            kind: 'card',
            accent: '#67839a',
            background: '#283746',
            backgroundEnd: '#1a2a39',
            disabled: true,
        }, x, topRowY, 0.12);
    });

    addPanel(group, targets, {
        width: mobile ? 2.4 : 2.75,
        height: 0.46,
        title: props.bottomPlayerName || (mode === 'ai' ? 'YOUR HAND' : `PLAYER ${props.turn}`),
        subtitle: hands.canPlay ? 'CHOOSE A MOVE CARD' : 'WAITING FOR YOUR TURN',
        accent: props.turn === 1 ? '#d76658' : '#599ac6',
    }, bottomCenter, bottomRowY + 0.84, 0.11);

    const bottomTotal = bottomCards.length * bottomCardWidth + Math.max(0, bottomCards.length - 1) * gap;
    const bottomStart = bottomCenter - bottomTotal / 2 + bottomCardWidth / 2;
    bottomCards.forEach((card, index) => {
        const selected = props.selectedCard?.name === card?.name;
        addPanel(group, targets, {
            width: bottomCardWidth,
            height: cardHeight,
            title: card?.name || 'MOVE',
            moves: card?.moves || [],
            kind: 'card',
            selected,
            accent: props.turn === 1 ? '#d76658' : '#599ac6',
            action: 'selectCard',
            payload: card,
            disabled: !hands.canPlay || props.isConfirming || Boolean(props.winner),
        }, bottomStart + index * (bottomCardWidth + gap), bottomRowY, 0.2);
    });

    if (props.extraCard) {
        addPanel(group, targets, {
            width: mobile ? 0.92 : 1.08,
            height: mobile ? 0.82 : 0.9,
            title: props.extraCard.name || 'NEXT',
            eyebrow: 'ON DECK',
            moves: props.extraCard.moves || [],
            kind: 'card',
            accent: '#d1a545',
            background: '#e9ddc1',
            disabled: true,
        }, bottomCenter + bottomTotal / 2 + gap + (mobile ? 0.46 : 0.54), bottomRowY + 0.08, 0.2);
    }

    if (aspect > 1.0) {
        const sideX = viewWidth / 2 - 1.47;
        addPanel(group, targets, {
            width: 2.55,
            height: 0.86,
            title: props.leftSideName || 'THE HIVE',
            subtitle: mode === 'online' ? `RATING ${props.leftSideLevel ?? '—'}` : 'PROTECT YOUR QUEEN',
            accent: '#d76658',
        }, -sideX, 0.6, 0.08);
        addPanel(group, targets, {
            width: 2.55,
            height: 0.86,
            title: props.rightSideName || 'RIVAL HIVE',
            subtitle: mode === 'online' ? `RATING ${props.rightSideLevel ?? '—'}` : 'CONTROL THE HEXES',
            accent: '#599ac6',
        }, sideX, 0.6, 0.08);
    }

    if (props.isConfirming && !props.winner && !props.menuOpen) {
        addPanel(group, targets, {
            width: 1.8,
            height: 0.62,
            title: 'CANCEL',
            kind: 'button',
            action: 'cancelMove',
            accent: '#768793',
        }, -1.05, bottomY, 0.24);
        addPanel(group, targets, {
            width: 2.0,
            height: 0.62,
            title: 'CONFIRM MOVE',
            kind: 'button',
            action: 'confirmMove',
            accent: '#4d9878',
        }, 1.05, bottomY, 0.24);
    } else if (!props.menuOpen && !props.winner) {
        addPanel(group, targets, {
            width: Math.min(5.0, viewWidth - 0.6),
            height: 0.42,
            title: props.selectedCard ? 'SELECT ONE OF YOUR BEES' : 'CHOOSE A CARD TO REVEAL LEGAL MOVES',
            accent: '#687f83',
        }, 0, bottomY, 0.18);
    }

    if (props.menuOpen && !props.winner) {
        addBlocker(group, targets, viewWidth, viewHeight, 0.45);
        addPanel(group, targets, {
            width: Math.min(5.8, viewWidth - 0.8),
            height: 1.25,
            eyebrow: 'MATCH PAUSED',
            title: 'GAME MENU',
            subtitle: mode === 'local' ? 'The view follows the active player.' : 'Your view stays on your side during opponent turns.',
            accent: '#d4a947',
        }, 0, 1.15, 0.58);
        addPanel(group, targets, { width: 3.4, height: 0.72, title: 'RESUME MATCH', kind: 'button', action: 'resume', accent: '#4d9878' }, 0, 0.1, 0.61);
        addPanel(group, targets, {
            width: 3.4,
            height: 0.68,
            title: mode === 'online' ? 'RESIGN MATCH' : 'LEAVE GAME',
            kind: 'button',
            action: mode === 'online' ? 'requestResign' : 'requestLeave',
            accent: '#b85952',
        }, 0, -0.78, 0.61);
        addPanel(group, targets, { width: 2.0, height: 0.5, title: 'CLOSE', kind: 'button', action: 'resume', accent: '#788a91' }, 0, -1.65, 0.61);

        if (props.leaveConfirm) {
            addBlocker(group, targets, viewWidth, viewHeight, 0.72);
            addPanel(group, targets, {
                width: Math.min(5.6, viewWidth - 1),
                height: 1.0,
                title: mode === 'online' ? 'RESIGN THIS MATCH?' : 'LEAVE THIS GAME?',
                subtitle: mode === 'ai' ? 'This game will not be saved.' : 'You can return to the hive at any time.',
                accent: '#ba5e55',
            }, 0, 0.8, 0.8);
            addPanel(group, targets, { width: 2.0, height: 0.65, title: mode === 'online' ? 'RESIGN MATCH' : 'LEAVE GAME', kind: 'button', action: 'confirmLeave', accent: '#b85952' }, -1.15, -0.55, 0.83);
            addPanel(group, targets, { width: 2.0, height: 0.65, title: 'CANCEL', kind: 'button', action: 'cancelLeave', accent: '#4d9878' }, 1.15, -0.55, 0.83);
        }
    }

    if (props.winner) {
        addBlocker(group, targets, viewWidth, viewHeight, 0.48);
        const won = props.didWin === null || props.didWin === undefined
            ? (props.winner === 'Red' ? 'PLAYER 1 WINS' : 'PLAYER 2 WINS')
            : (props.didWin ? 'VICTORY' : 'DEFEAT');
        const resultDetail = props.winType === 'Resignation'
            ? (props.didWin === true ? 'Your opponent resigned.' : props.didWin === false ? 'You resigned.' : 'The match ended by resignation.')
            : 'The queen has fallen.';
        addPanel(group, targets, {
            width: Math.min(6.4, viewWidth - 0.8),
            height: 1.72,
            eyebrow: props.winType ? String(props.winType).toUpperCase() : 'MATCH COMPLETE',
            title: won,
            subtitle: props.ratingDelta === null || props.ratingDelta === undefined ? resultDetail : `${Number(props.ratingDelta) > 0 ? '+' : ''}${props.ratingDelta} RATING`,
            accent: won.includes('DEFEAT') ? '#bf6258' : '#d4a947',
        }, 0, 0.9, 0.61);
        addPanel(group, targets, { width: 2.8, height: 0.72, title: 'BACK TO THE HIVE', kind: 'button', action: 'exitMatch', accent: '#4d9878' }, 0, -0.38, 0.64);
        if (props.onRematch) addPanel(group, targets, { width: 2.8, height: 0.65, title: 'REMATCH', kind: 'button', action: 'rematch', accent: '#d2a746' }, 0, -1.24, 0.64);
    }

    return targets;
}
