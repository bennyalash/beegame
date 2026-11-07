# BeeGame: Full Three.js Interface and Pointy-Top Board

## Product goal
Replace the current split presentation—3D board plus HTML/CSS app chrome—with a game-first, fully scene-rendered experience. Every visible screen and control (sign-in, lobby, friends, active/recent games, notification settings, in-match cards/HUD/menu, and match results) should be drawn and interactive inside Three.js canvases. Preserve Firebase state and the installable/downloadable PWA; this is a presentation and interaction-shell refactor, not a rewrite of game rules or notification services.

## Design direction
**Design movement:** a polished competitive tabletop crossed with the lively, collectible-character staging of modern mobile strategy games. Borrow the clarity, information hierarchy, and competitive readability of the user's Chess.com reference and the bold dimensionality and expressive character presence of the user's Clash Royale reference; create original Go Bee art and UI rather than copying either product.

**Core principles:** (1) every visible control belongs to the 3D scene; (2) game state is readable at a glance; (3) tactile, beveled materials distinguish board, cards, and actions; (4) motion supports turns and feedback without obstructing play.

**Color philosophy:** midnight blue/green scene foundations keep the hive legible; honey-gold marks focus, selection, and rewards; the two sides use clear warm-red and cobalt-blue accents. Use restrained metallic trim rather than broad neon glows.

**Layout paradigm:** full-viewport 3D diorama, not a centered webpage. The home/social screens stage thick, camera-facing 3D navigation panels around an original bee champion. Match screens place the pointy-top board in the tabletop, with physically modeled movement cards, readable turn/status plaques, and pause/result panels composed in the same camera view. Responsive camera framing reflows panels and card rows for desktop, portrait mobile, and landscape.

**Signature elements:** a hexagonal arena plinth with beveled pointy-top tiles; embossed, hinged movement cards with in-scene diagrams; original bee champions with segmented chitin, expressive faces, small wings, and side-specific enamel armor.

**Interaction philosophy:** raycast selection for 3D board tiles, pieces, cards, navigation panels, and buttons; restrained hover/press feedback; keyboard and screen-reader equivalents remain available through a visually-hidden semantic control layer, while all visible UI remains in the canvas.

**Animation:** eased panel arrivals, a brief lift/tilt on card selection, small champion idle motion, clear legal-move/capture response, and a stable signed-in-player camera across online opponent turns. Local hot-seat view may orient to the active seat so neither player sees the board upside down.

**Typography system:** preserve Rubik for compact interface copy and Odibee Sans for short game headings; render text sharply onto Three.js canvas textures with sufficient scale and contrast.

**Brand essence:** an approachable strategy hive for quick, competitive matches; **clever, tactile, spirited**.

**Brand voice:** concise and game-aware, not generic. Examples: “Your move.” and “Defend the queen.”

**Wordmark & logo:** retain Go Bee's hive mark and existing wordmark, mounted as a clean scene plaque; do not generate replacement typography.

**Signature brand color:** honey gold, reserved for selection, progress, and reward cues.

## Implementation approach
- Keep React Router, Firebase auth/data subscriptions, game rules, challenge/accept flows, push/email endpoints and preferences as the state/data layer.
- Replace each route's visible DOM UI with route-level Three.js canvases. Data-owning components pass text/data/actions into a shared scene UI renderer; raycast actions call the existing navigation, game, notification, and friend handlers.
- Build reusable Three.js UI materials: beveled panel/card meshes, crisp CanvasTexture labels and diagrams, pointer raycasting, responsive camera-space layout, and accessible keyboard/semantic equivalents.
- Extend the match renderer so board, game HUD, both card hands, confirmation, pause/settings, and result state share a single visible scene/canvas.
- Design a reusable procedural 3D bee champion model rather than reusing flat bee images as the hero character.
- Correct hex orientation at the geometry level: use the native pointy-top vertex orientation of regular `CylinderGeometry` (zero Y rotation), preserve pointy-top axial spacing, and use pointy-top polygons in any remaining preview/diagram geometry. A Three.js geometry regression test verifies the mesh vertex orientation.
- Preserve all existing PWA routes and update the static route manifest if routes change.

## Project structure
- `src/App.jsx`: auth state and route wiring; route-level canvas shell placement.
- `src/components/ThreeAppCanvas.jsx`: sign-in, lobby, friends, game lists, invitations and notification preference scene UI.
- `src/components/ThreeGameBoard.jsx`: one match renderer for board, cards, HUD, menu and result UI.
- `src/three/ui/`: reusable canvas-texture panels, 3D buttons/cards, raycast action mapping and responsive scene layout.
- `src/three/characters/beeChampion.js`: reusable original bee character geometry/materials.
- `src/game/hexGrid.js`: shared pointy-top axial/world orientation and board rules.
- Existing React page/game modules remain the Firestore/game-state controllers; they provide scene props and action callbacks instead of rendering visible DOM controls.

## Constraints
- Do not merge into `master` without a separate user request.
- Keep desktop browser play; installing the PWA remains optional.
- Preserve sign-in, multiplayer invitations, friends, game history, notification preferences, gameplay rules, and PWA/service-worker behavior.
- Use no copied Chess.com/Clash Royale art or branding; create original bee character and board treatments.
