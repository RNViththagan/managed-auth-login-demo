# managed-auth-login-demo

Throwaway components for testing Choreo Managed Authentication / Asgardeo integration on
stage. One component per top-level folder, deployed via Choreo's "Component Directory"
picker, matching the `wso2/choreo-samples` layout.

Two components, mirroring the split-component-bearer-token design
(`.internal-works/usage-limits/auth-investigation/01-split-component-bearer-token-design.md`
in `integrator-copilot`) — a backend that owns the OIDC dance against a sandbox Asgardeo
org, and a separate static frontend that only ever holds a bearer access token:

- `webapp/` — backend. Express + `openid-client`. `/auth/login`, `/auth/callback`
  (redirects to `FRONTEND_URL/?access_token=...`), `/api/whoami` (validates a Bearer token
  live against Asgardeo's `/userinfo` and returns its claims). Also keeps a session-based
  `/` and `/whoami` for testing it standalone, monolithic, before splitting.
- `frontend/` — plain static HTML/JS, no build step. Reads `?access_token=` on load,
  stores it in `sessionStorage`, calls the backend's `/api/whoami` with
  `Authorization: Bearer`. `config.js` holds `window.BACKEND_URL` — update after the
  backend is deployed and known.
