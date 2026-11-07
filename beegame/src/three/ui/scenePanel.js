import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { BOARD_COORDS } from '../../game/hexGrid.js';

const PALETTE = {
    ink: '#172333',
    inkLight: '#253447',
    cream: '#f6f0e2',
    muted: '#b6c0c2',
    gold: '#e4b64c',
};

export function getMoveCardHexStates(moves = []) {
    const destinationKeys = new Set(moves.map(({ x, y }) => `${x},${y}`));
    return BOARD_COORDS.map(([q, r]) => ({
        q,
        r,
        state: q === 0 && r === 0 ? 'origin' : destinationKeys.has(`${q},${r}`) ? 'move' : 'faded',
    }));
}

function roundedRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
}

function drawPointyHex(context, x, y, radius, fill, stroke = '#d7bd78') {
    context.beginPath();
    for (let index = 0; index < 6; index += 1) {
        const angle = (Math.PI / 3) * index - Math.PI / 2;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;
        if (index === 0) context.moveTo(px, py);
        else context.lineTo(px, py);
    }
    context.closePath();
    context.fillStyle = fill;
    context.fill();
    context.strokeStyle = stroke;
    context.lineWidth = Math.max(3, radius * 0.07);
    context.stroke();
}

function wrapText(context, text, x, y, maxWidth, lineHeight) {
    if (!text) return y;
    const words = String(text).split(/\s+/);
    let line = '';
    for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (line && context.measureText(candidate).width > maxWidth) {
            context.fillText(line, x, y);
            line = word;
            y += lineHeight;
        } else {
            line = candidate;
        }
    }
    if (line) {
        context.fillText(line, x, y);
        y += lineHeight;
    }
    return y;
}

function createPanelCanvas(options, panelWidth, panelHeight) {
    const canvas = document.createElement('canvas');
    const pixelsPerUnit = Math.min(600, 4096 / Math.max(panelWidth, panelHeight));
    canvas.width = Math.max(256, Math.round(panelWidth * pixelsPerUnit));
    canvas.height = Math.max(128, Math.round(panelHeight * pixelsPerUnit));
    const context = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const inset = Math.round(Math.min(width, height) * 0.025);
    const isCard = options.kind === 'card';
    const isButton = options.kind === 'button';
    const lightSurface = isCard || Boolean(options.background);
    const safeAspect = canvas.width / canvas.height;
    const accent = options.accent || PALETTE.gold;
    const bg = options.background || (isCard ? '#efe4c9' : '#1d2c3a');

    context.clearRect(0, 0, width, height);
    const gradient = context.createLinearGradient(0, 0, width, height);
    if (isCard) {
        gradient.addColorStop(0, options.selected ? '#fff1c8' : '#f4ebd7');
        gradient.addColorStop(1, options.selected ? '#e3bd63' : '#ded1b2');
    } else {
        gradient.addColorStop(0, options.selected ? '#33495a' : bg);
        gradient.addColorStop(1, options.selected ? '#243d49' : (options.backgroundEnd || '#142332'));
    }

    roundedRect(context, inset, inset, width - inset * 2, height - inset * 2, Math.min(36, height * 0.08));
    context.fillStyle = gradient;
    context.fill();
    context.lineWidth = Math.max(2, height * 0.006);
    context.strokeStyle = options.selected ? '#d5aa4e' : (isCard ? '#92876770' : '#d7ddce35');
    context.stroke();

    if (!isCard && !isButton) {
        roundedRect(context, inset + 8, inset + 8, Math.max(5, width * 0.006), height - inset * 2 - 16, 8);
        context.fillStyle = accent;
        context.fill();
    }

    const left = isCard ? width * 0.07 : width * 0.06;
    const titleY = options.eyebrow ? height * 0.39 : height * 0.47;
    const titleColor = lightSurface ? '#24303a' : PALETTE.cream;
    const compactWidePanel = safeAspect >= 10;
    const titleSize = Math.max(18, Math.min(180, height * (compactWidePanel ? 0.28 : isButton ? 0.42 : 0.34)));

    if (options.eyebrow) {
        context.font = `700 ${Math.max(25, height * 0.075)}px Rubik, sans-serif`;
        context.fillStyle = lightSurface ? '#7b622f' : '#e8be5c';
        context.textAlign = 'left';
        context.textBaseline = 'middle';
        context.fillText(String(options.eyebrow).toUpperCase(), left, height * 0.2, width - left * 2);
    }

    if (options.moves) {
        context.font = `700 ${Math.max(34, height * 0.12)}px "Odibee Sans", sans-serif`;
        context.fillStyle = titleColor;
        context.textAlign = 'left';
        context.textBaseline = 'middle';
        context.fillText(String(options.title || 'Move').toUpperCase(), left, height * 0.18, width * 0.65);

        const radius = Math.min(width, height) * 0.075;
        const centerX = width * 0.55;
        const centerY = height * 0.66;
        const spacingX = Math.sqrt(3) * radius;
        const spacingY = 1.5 * radius;
        for (const cell of getMoveCardHexStates(options.moves)) {
            const { q, r } = cell;
            const x = centerX + spacingX * (q + r / 2);
            const y = centerY + spacingY * r;
            const fill = cell.state === 'origin' ? '#41634f' : cell.state === 'move' ? '#d9b45d' : '#59665b40';
            const stroke = cell.state === 'origin' ? '#e8d79c' : cell.state === 'move' ? '#ecd79b' : '#7a887b55';
            drawPointyHex(context, x, y, radius * 0.86, fill, stroke);
        }
        return canvas;
    }

    context.font = `700 ${titleSize}px "Rubik", sans-serif`;
    context.fillStyle = titleColor;
    context.textAlign = 'left';
    context.textBaseline = 'middle';
    const maxTitleWidth = options.trailing ? width * 0.72 : width - left * (isButton ? 3.0 : 2.0);
    context.fillText(String(options.title || ''), left, titleY, maxTitleWidth);

    if (options.trailing) {
        context.font = `700 ${Math.max(34, height * 0.18)}px "Rubik", sans-serif`;
        context.fillStyle = lightSurface ? '#7e672f' : '#f2cb6c';
        context.textAlign = 'right';
        context.fillText(String(options.trailing), width - left, titleY, width * 0.2);
    }

    const subtitle = options.subtitle || options.detail || '';
    if (subtitle) {
        const subtitleSize = Math.max(14, Math.min(84, height * (compactWidePanel ? 0.11 : 0.17)));
        context.font = `500 ${subtitleSize}px "Rubik", sans-serif`;
        context.fillStyle = lightSurface ? '#625e52' : PALETTE.muted;
        context.textBaseline = 'top';
        context.textAlign = 'left';
        wrapText(context, String(subtitle), left, height * (options.eyebrow ? 0.58 : 0.67), width - left * 2, subtitleSize * 1.32);
    }

    if (options.badge) {
        const badgeX = width - left * 1.75;
        const badgeY = height * 0.24;
        const badgeRadius = Math.min(width, height) * 0.075;
        drawPointyHex(context, badgeX, badgeY, badgeRadius, accent, '#fff0b9');
        context.font = `700 ${badgeRadius * 0.78}px "Rubik", sans-serif`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillStyle = '#172333';
        context.fillText(String(options.badge), badgeX, badgeY + 1, badgeRadius * 1.6);
    }

    if (isButton) {
        context.strokeStyle = accent;
        context.lineWidth = Math.max(2, height * 0.035);
        context.lineCap = 'round';
        context.beginPath();
        const arrowX = width - left * 1.35;
        const arrowY = height * 0.5;
        context.moveTo(arrowX - height * 0.045, arrowY - height * 0.07);
        context.lineTo(arrowX + height * 0.025, arrowY);
        context.lineTo(arrowX - height * 0.045, arrowY + height * 0.07);
        context.stroke();
    }
    return canvas;
}

export function createScenePanel({
    width = 2.6,
    height = 0.9,
    depth = 0.16,
    title = '',
    subtitle = '',
    detail = '',
    eyebrow = '',
    badge,
    trailing,
    moves,
    action,
    payload,
    kind = 'panel',
    accent,
    background,
    backgroundEnd,
    selected = false,
    disabled = false,
}) {
    const group = new THREE.Group();
    const baseColor = kind === 'card' ? '#cbbd9a' : '#263b38';
    const body = new THREE.Mesh(
        new RoundedBoxGeometry(width, height, depth, 3, Math.min(0.045, depth * 0.28)),
        new THREE.MeshStandardMaterial({
            color: baseColor,
            roughness: kind === 'card' ? 0.76 : 0.8,
            metalness: 0.025,
            emissive: selected ? '#4e3712' : '#000000',
            emissiveIntensity: selected ? 0.28 : 0,
        }),
    );
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const canvas = createPanelCanvas({ title, subtitle, detail, eyebrow, badge, trailing, moves, kind, accent, background, backgroundEnd, selected }, width, height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = 8;
    const face = new THREE.Mesh(
        new THREE.PlaneGeometry(width - 0.08, height - 0.08),
        new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, transparent: false, side: THREE.DoubleSide }),
    );
    face.position.z = depth / 2 + 0.002;
    face.userData.action = disabled ? null : action;
    face.userData.payload = payload;
    face.userData.interactive = Boolean(action) && !disabled;
    group.add(face);

    if (action && !disabled) {
        group.userData.action = action;
        group.userData.payload = payload;
        group.userData.interactive = true;
        body.userData.action = action;
        body.userData.payload = payload;
        body.userData.interactive = true;
    }
    group.userData.dispose = () => {
        body.geometry.dispose();
        body.material.dispose();
        face.geometry.dispose();
        face.material.map?.dispose();
        face.material.dispose();
    };
    group.userData.title = title;
    return group;
}
