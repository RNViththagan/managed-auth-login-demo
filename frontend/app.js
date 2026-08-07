(function () {
  const app = document.getElementById('app');
  const url = new URL(window.location.href);
  const tokenFromUrl = url.searchParams.get('access_token');

  if (tokenFromUrl) {
    sessionStorage.setItem('access_token', tokenFromUrl);
    url.searchParams.delete('access_token');
    window.history.replaceState({}, '', url.pathname);
  }

  const token = sessionStorage.getItem('access_token');

  if (!token) {
    app.innerHTML = '<p><a href="' + window.BACKEND_URL + '/oidc/login">Sign in</a></p>';
    return;
  }

  fetch(window.BACKEND_URL + '/api/whoami', {
    headers: { Authorization: 'Bearer ' + token },
  })
    .then((r) => r.json().then((body) => ({ status: r.status, body })))
    .then(({ status, body }) => {
      if (status !== 200) {
        sessionStorage.removeItem('access_token');
        app.innerHTML = '<p>Token rejected (' + status + '): ' + JSON.stringify(body) + '</p><p><a href="' + window.BACKEND_URL + '/oidc/login">Sign in again</a></p>';
        return;
      }
      app.innerHTML = '<h2>Signed in</h2><pre>' + JSON.stringify(body, null, 2) + '</pre>' +
        '<p><button id="signout">Sign out</button></p>';
      document.getElementById('signout').onclick = function () {
        sessionStorage.removeItem('access_token');
        window.location.href = '/';
      };
    })
    .catch((err) => {
      app.innerHTML = '<p>Request failed: ' + err.message + '</p>';
    });
})();
