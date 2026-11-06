# Go Bee

Go Bee is a React + Vite strategy game that runs in a regular desktop or mobile browser and can also be installed as a Progressive Web App (PWA). Installation is optional; the same routes and game features are available in the browser.

## Development

```sh
npm ci
npm run dev
```

Build and lint the frontend with:

```sh
npm run build
npm run lint
```

The frontend uses Firebase Authentication and Firestore. Online invitations are sent through Netlify Functions in `netlify/functions/`.

## Notification delivery configuration

Push and email notifications are delivered by the `send-notification` Netlify Function. For deployments, configure these environment variables in Netlify (never commit their values):

- `FIREBASE_SERVICE_ACCOUNT`: Firebase Admin service-account JSON for the Go Bee Firebase project.
- `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`: matching Web Push VAPID keys. The public key must match `VAPID_PUBLIC_KEY` in `src/config.js`.
- `VAPID_SUBJECT`: a contact URI such as `mailto:admin@example.com` (optional; defaults to the current project contact).
- `RESEND_API_KEY`: Resend API key for email delivery.
- `NOTIFICATION_FROM_EMAIL`: a sender address verified with Resend, for example `Go Bee <notifications@example.com>`.
- `APP_URL`: the deployed HTTPS origin used for email links, such as `https://example.netlify.app`.

Firebase Authentication must allow the deployed app's domain. The user must opt in to email notifications from the in-app Notifications settings; push permission is managed per browser/device. Push notifications require HTTPS (except local development). If the Resend credentials or a verified sender are absent, email delivery is intentionally reported as not configured rather than silently claiming success.

## PWA

The manifest, icons, and service worker live under `public/`. Users may install the app on supported devices, but desktop browser users are not prompted or required to install it.
