const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.disable("x-powered-by");

function htmlPage({ title, testCase, heading, body, extraHead = "" }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="SearchStax crawler outcome QA fixture - Author - Shubham Sharma ">
  <meta name="qa-test-case" content="${testCase}">
  ${extraHead}
  <title>${title}</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <main class="container">
    <p><a href="/">← QA test dashboard</a></p>
    <div class="card">
      <span class="badge">${testCase}</span>
      <h1>${heading}</h1>
      ${body}
    </div>
  </main>
</body>
</html>`;
}

app.use(express.static("public", { index: false }));

// Explicitly allow crawling while the Render service is awake.
app.get("/robots.txt", (req, res) => {
  res.type("text/plain").send("User-agent: *\nAllow: /\n");
});

app.get("/", (req, res) => {
  res.status(200).send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="SearchStax crawler outcome QA site">
  <meta name="qa-site-version" content="outcome-qa-v1">
  <title>SearchStax Crawler Outcome QA Site</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <main class="container">
    <header>
      <p class="eyebrow">SearchStax QA Fixture --- Author - Shubham Sharma</p>
      <h1>Crawler Outcome QA Site</h1>
      <p>
        Deterministic endpoints for validating standardized
        <code>operational.outcome.recorded</code> events.
      </p>
    </header>

    <section class="grid">
      <a class="card link-card" href="/valid">
        <span class="status good">200</span>
        <h2>Valid page</h2>
        <code>/valid</code>
        <p>Normal HTML that can continue through Parser and Indexer.</p>
      </a>

      <a class="card link-card" href="/not-found">
        <span class="status bad">404</span>
        <h2>HTTP failure</h2>
        <code>/not-found</code>
        <p>Returns a real HTTP 404 response.</p>
      </a>

      <a class="card link-card" href="/redirect">
        <span class="status warn">302</span>
        <h2>Redirect</h2>
        <code>/redirect</code>
        <p>Returns HTTP 302 and redirects to <code>/valid</code>.</p>
      </a>

      <a class="card link-card" href="/excluded/page">
        <span class="status neutral">200</span>
        <h2>Configured exclusion</h2>
        <code>/excluded/page</code>
        <p>Valid page. Configure the crawler to exclude <code>/excluded/*</code>.</p>
      </a>

      <a class="card link-card" href="/parser-invalid">
        <span class="status bad">QA</span>
        <h2>Parser invalid document</h2>
        <code>/parser-invalid</code>
        <p>Returns deliberately invalid PDF bytes with an application/pdf content type.</p>
      </a>

      <a class="card link-card" href="/indexer-rejection">
        <span class="status bad">QA</span>
        <h2>Indexer rejection fixture</h2>
        <code>/indexer-rejection</code>
        <p>Contains a deliberately non-numeric QA value for a controlled Solr schema rejection.</p>
      </a>

      <a class="card link-card" href="/sanitize?email=test@example.com&token=qa-secret-123">
        <span class="status warn">QA</span>
        <h2>Sanitization fixture</h2>
        <code>/sanitize?...PII-like values...</code>
        <p>Useful for checking that URL and diagnostic sanitization works as designed.</p>
      </a>
    </section>

    <section class="card">
      <h2>Expected crawler outcomes</h2>
      <table>
        <thead><tr><th>Route</th><th>Outcome</th><th>Issue code</th></tr></thead>
        <tbody>
          <tr><td><code>/not-found</code></td><td>FAILED</td><td><code>crawler.http_error</code></td></tr>
          <tr><td><code>/redirect</code></td><td>REDIRECTED</td><td><code>crawler.redirected</code></td></tr>
          <tr><td><code>/excluded/page</code></td><td>EXCLUDED</td><td><code>crawler.configured_exclusion</code></td></tr>
        </tbody>
      </table>
      <p class="note">Successful URLs are intentionally not expected to emit the standardized outcome event for this ticket.</p>
    </section>
  </main>
</body>
</html>`);
});

app.get("/valid", (req, res) => {
  res.status(200).send(htmlPage({
    title: "Crawler QA - Valid",
    testCase: "pipeline-valid",
    heading: "Valid pipeline page",
    body: `
      <p>This page returns HTTP 200 and contains normal HTML.</p>
      <p>It should be eligible to continue through Crawler → Parser → Indexer.</p>
      <p><a href="/not-found">Discover 404 test</a></p>
      <p><a href="/redirect">Discover redirect test</a></p>
      <p><a href="/excluded/page">Discover exclusion test</a></p>
      <p><a href="/parser-invalid">Discover parser-invalid test</a></p>
      <p><a href="/indexer-rejection">Discover indexer rejection fixture</a></p>`
  }));
});

app.get("/not-found", (req, res) => {
  res.status(404).send(htmlPage({
    title: "Crawler QA - 404",
    testCase: "crawler-http-404",
    heading: "HTTP 404 test",
    body: "<p>This endpoint deliberately returns a real HTTP 404 status.</p>"
  }));
});

app.get("/redirect", (req, res) => {
  res.redirect(302, "/valid");
});

//app.get("/redirect", (req, res) => {
//  res.redirect(
//    302,
//    "https://qa-automation.searchstax.co/v1/minisite/custom_en/index.html"
//  );
// });

app.get("/excluded/page", (req, res) => {
  res.status(200).send(htmlPage({
    title: "Crawler QA - Configured Exclusion",
    testCase: "crawler-configured-exclusion",
    heading: "Configured exclusion test",
    body: `
      <p>This endpoint itself returns HTTP 200.</p>
      <p>Configure the Studio crawler exclusion rule to match <code>/excluded/*</code>.</p>`
  }));
});

app.get("/parser-invalid", (req, res) => {
  // Deliberately malformed bytes advertised as PDF.
  // Whether this triggers parser.processing_failed depends on the staging parser's
  // current handling of malformed PDFs. Confirm with the parser implementation.
  const invalidPdf = Buffer.from(
    "%PDF-1.7\n% SearchStax QA malformed PDF\n" +
    "THIS FILE IS INTENTIONALLY INVALID AND HAS NO VALID XREF OR TRAILER\n"
  );
  res.status(200);
  res.set("Content-Type", "application/pdf");
  res.set("Content-Disposition", 'inline; filename="parser-invalid.pdf"');
  res.set("X-QA-Test-Case", "parser-invalid");
  res.send(invalidPdf);
});

app.get("/indexer-rejection", (req, res) => {
  res.status(200).send(htmlPage({
    title: "Crawler QA - Indexer Rejection",
    testCase: "indexer-rejection",
    heading: "Controlled indexer rejection fixture",
    extraHead: '<meta name="qa_number" content="NOT_A_NUMBER">',
    body: `
      <p>This page is valid and crawlable.</p>
      <p>It includes <code>qa_number=NOT_A_NUMBER</code> in metadata.</p>
      <p>To force a deterministic Indexer failure, map that value into a QA Solr field
      whose schema rejects it (for example, an integer field), or use the controlled
      rejection mechanism agreed with the Indexer team.</p>
      <dl>
        <dt>qa_number</dt>
        <dd>NOT_A_NUMBER</dd>
      </dl>`
  }));
});

app.get("/sanitize", (req, res) => {
  res.status(200).send(htmlPage({
    title: "Crawler QA - Sanitization",
    testCase: "url-sanitization",
    heading: "URL sanitization fixture",
    body: `
      <p>This endpoint accepts query parameters so QA can inspect how URLs and
      diagnostics are sanitized in the standardized event.</p>
      <p>Do not put real secrets or personal data in this endpoint. Use test-only values.</p>`
  }));
});

app.get("/healthz", (req, res) => {
  res.status(200).json({
    status: "ok",
    site: "searchstax-crawler-outcome-qa",
    version: "1.0.0"
  });
});

// Catch-all must stay last so unknown paths are true 404s.
app.use((req, res) => {
  res.status(404).send(htmlPage({
    title: "Crawler QA - Unknown Path",
    testCase: "unknown-404",
    heading: "Unknown route",
    body: `<p>The requested path <code>${escapeHtml(req.path)}</code> does not exist.</p>`
  }));
});

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Crawler Outcome QA site listening on port ${PORT}`);
});
