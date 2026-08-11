const http = require('http');

const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    path: req.url,
    method: req.method,
    headers: req.headers,
  }, null, 2));
});

server.listen(PORT, () => {
  console.log(`whoami service listening on ${PORT}`);
});
