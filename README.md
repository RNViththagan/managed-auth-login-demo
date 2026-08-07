# managed-auth-login-demo

Throwaway components for testing Choreo Managed Authentication / Asgardeo integration on
stage. One component per top-level folder, deployed via Choreo's "Component Directory"
picker, matching the `wso2/choreo-samples` layout.

- `webapp/` — minimal Express app with its own OIDC login (via `openid-client`) against a
  sandbox Asgardeo org. `/`, `/whoami`, `/auth/login`, `/auth/callback`, `/auth/logout`.
