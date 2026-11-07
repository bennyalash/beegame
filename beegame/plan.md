# BeeGame: Full Three.js Interface and Pointy-Top Board

## Product goal
Replace the current split presentation—3D board plus HTML/CSS app chrome—with a game-first, fully scene-rendered experience. Every visible screen and control (sign-in, lobby, friends, active/recent games, notification settings, in-match cards/HUD/menu, and match results) should be drawn and interactive inside Three.js canvases. Preserve Firebase state and the installable/downloadable PWA; this is a presentation and interaction-shell refactor, not a rewrite of game rules or notification services.

## Design direction
**Design movement:** a refined, full-bleed strategy tabletop with a restrained modern game-client interface. Keep the original dimensional bee character, but remove oversized novelty framing, excessive metallic edging, floating clutter, and decorative filler. The canvas should feel like a polished game product rather than a concept render.

**Core principles:** (1) every visible control belongs to the 3D scene; (2) clear hierarchy, proportion, and spacing make every screen feel intentional; (3) full-viewport responsive composition replaces the small centered game-box layout; (4) precise raycast and keyboard interactions make every control and game move reliable; (5) render at device resolution with crisp, high-density canvas textures.

**Color philosophy:** a calm ink/forest foundation supports warm paper cards and restrained honey-gold focus cues; the two sides retain clear warm-red and blue identifiers. Avoid broad gold borders, shiny surfaces, and heavy shadowing that read as tacky or reduce clarity.

**Layout paradigm:** a truly full-viewport scene with deliberate safe-area padding. Desktop uses the available width for a balanced hero, navigation and content rather than a constrained square; mobile prioritizes the game board, thumb-sized controls and compact card rows, reflowing with viewport aspect and available height. Friends, game lists, settings and match screens share the same margins, type scale, alignment and spacing tokens.

**Signature elements:** restrained pointy-top hex diagrams on every move card (faded for non-destination cells, clearly emphasizing the origin and legal vectors); softly beveled playable hexes; one original bee champion used selectively as a supporting character, not as a substitute for page structure.

**Interaction philosophy:** raycast hit targets must map deterministically to visible 3D actions. Cards visibly select, owned pieces select, legal destinations highlight, and choosing a destination presents a clear confirm/cancel step. Pointer, touch, keyboard and semantic controls must trigger the same actions; add regression coverage for the complete local move path.

**Animation:** short, purposeful transitions with subdued idle motion, a crisp selection lift, visible legal-move/capture response and no camera movement that interferes with input. Respect reduced motion and maintain a stable signed-in-player camera across online turns.

**Typography system:** use Rubik for all interface text and reserve Odibee Sans for a few brief game headings. Keep text sizes readable at phone scale, use device-aware high-resolution textures, enable correct color space/anisotropy, and avoid enlarging low-resolution texture content.

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
