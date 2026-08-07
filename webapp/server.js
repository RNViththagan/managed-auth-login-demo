'use strict';

const express = require('express');
const session = require('express-session');
const { Issuer, generators } = require('openid-client');

const PORT = process.env.PORT || 8080;
const OIDC_ISSUER = process.env.OIDC_ISSUER;
const OIDC_CLIENT_ID = process.env.OIDC_CLIENT_ID;
const OIDC_CLIENT_SECRET = process.env.OIDC_CLIENT_SECRET;
const OIDC_REDIRECT_URI = process.env.OIDC_REDIRECT_URI;

const app = express();
app.use(session({
  secret: process.env.SESSION_SECRET || 'throwaway-demo-secret',
  resave: false,
  saveUninitialized: false,
}));

let client = null;
let endSessionEndpoint = null;

async function init() {
  if (!OIDC_ISSUER || !OIDC_CLIENT_ID || !OIDC_CLIENT_SECRET || !OIDC_REDIRECT_URI) {
    console.warn('[auth] OIDC env vars not fully set — /auth/login will 503');
    return;
  }
  const issuer = await Issuer.discover(OIDC_ISSUER);
  endSessionEndpoint = issuer.metadata.end_session_endpoint || null;
  client = new issuer.Client({
    client_id: OIDC_CLIENT_ID,
    client_secret: OIDC_CLIENT_SECRET,
    redirect_uris: [OIDC_REDIRECT_URI],
    response_types: ['code'],
  });
  console.log(`[auth] OIDC ready (issuer: ${issuer.metadata.issuer})`);
}

app.get('/', (req, res) => {
  if (!req.session.user) {
    return res.send('<h1>Managed Auth login demo</h1><p><a href="/auth/login">Sign in</a></p>');
  }
  const { claims, accessToken } = req.session.user;
  res.send(`
    <h1>Signed in</h1>
    <p><a href="/auth/logout">Sign out</a></p>
    <h2>ID token claims</h2>
    <pre>${JSON.stringify(claims, null, 2)}</pre>
    <p>Access token present: ${accessToken ? 'yes (' + accessToken.length + ' chars)' : 'no'}</p>
    <p><a href="/whoami">/whoami (JSON)</a></p>
  `);
});

app.get('/whoami', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'unauthenticated' });
  res.json(req.session.user.claims);
});

app.get('/auth/login', (req, res) => {
  if (!client) return res.status(503).send('OIDC not configured');
  const code_verifier = generators.codeVerifier();
  const state = generators.state();
  req.session.oidc = { code_verifier, state };
  const authUrl = client.authorizationUrl({
    scope: 'openid profile email groups',
    state,
    code_challenge: generators.codeChallenge(code_verifier),
    code_challenge_method: 'S256',
  });
  res.redirect(authUrl);
});

app.get('/auth/callback', async (req, res) => {
  if (!client) return res.status(503).send('OIDC not configured');
  const saved = req.session.oidc;
  if (!saved) return res.redirect('/?error=missing_session');
  try {
    const params = client.callbackParams(req);
    const tokenSet = await client.callback(OIDC_REDIRECT_URI, params, {
      code_verifier: saved.code_verifier,
      state: saved.state,
    });
    req.session.user = {
      claims: tokenSet.claims(),
      accessToken: tokenSet.access_token,
    };
    delete req.session.oidc;
    res.redirect('/');
  } catch (err) {
    console.error('[auth] callback failed:', err.message);
    res.status(500).send(`Callback failed: ${err.message}`);
  }
});

app.get('/auth/logout', (req, res) => {
  req.session.destroy(() => {
    if (endSessionEndpoint) {
      return res.redirect(`${endSessionEndpoint}?post_logout_redirect_uri=${encodeURIComponent(OIDC_REDIRECT_URI.replace(/\/auth\/callback$/, '/'))}`);
    }
    res.redirect('/');
  });
});

init().then(() => {
  app.listen(PORT, () => console.log(`Listening on ${PORT}`));
});
