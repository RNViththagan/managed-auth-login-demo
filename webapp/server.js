'use strict';

const express = require('express');
const session = require('express-session');
const { Issuer, generators } = require('openid-client');

const PORT = process.env.PORT || 8080;
const OIDC_ISSUER = process.env.OIDC_ISSUER;
const OIDC_CLIENT_ID = process.env.OIDC_CLIENT_ID;
const OIDC_CLIENT_SECRET = process.env.OIDC_CLIENT_SECRET;
const OIDC_REDIRECT_URI = process.env.OIDC_REDIRECT_URI;
const FRONTEND_URL = process.env.FRONTEND_URL || '';

const app = express();
app.use(session({
  secret: process.env.SESSION_SECRET || 'throwaway-demo-secret',
  resave: false,
  saveUninitialized: false,
}));
app.use((req, res, next) => {
  if (FRONTEND_URL) res.header('Access-Control-Allow-Origin', FRONTEND_URL);
  res.header('Access-Control-Allow-Headers', 'Authorization');
  next();
});

let client = null;
let endSessionEndpoint = null;

async function init() {
  if (!OIDC_ISSUER || !OIDC_CLIENT_ID || !OIDC_CLIENT_SECRET || !OIDC_REDIRECT_URI) {
    console.warn('[auth] OIDC env vars not fully set — /oidc/login will 503');
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
    return res.send('<h1>Managed Auth login demo</h1><p><a href="/oidc/login">Sign in</a></p>');
  }
  const { claims, accessToken } = req.session.user;
  res.send(`
    <h1>Signed in</h1>
    <p><a href="/oidc/logout">Sign out</a></p>
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

app.get('/oidc/login', (req, res) => {
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

app.get('/oidc/callback', async (req, res) => {
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
    if (FRONTEND_URL) {
      return res.redirect(`${FRONTEND_URL}/?access_token=${encodeURIComponent(tokenSet.access_token)}`);
    }
    res.redirect('/');
  } catch (err) {
    console.error('[auth] callback failed:', err.message);
    res.status(500).send(`Callback failed: ${err.message}`);
  }
});

// Bearer-token variant for a separate frontend (mirrors 01-split-component-bearer-token-design.md)
app.get('/api/whoami', async (req, res) => {
  if (!client) return res.status(503).json({ error: 'oidc_not_configured' });
  const auth = req.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing_bearer_token' });
  try {
    const claims = await client.userinfo(token);
    res.json(claims);
  } catch (err) {
    res.status(401).json({ error: 'invalid_token', message: err.message });
  }
});

app.get('/oidc/logout', (req, res) => {
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
