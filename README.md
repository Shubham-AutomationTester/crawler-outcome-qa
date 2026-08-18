# SearchStax Crawler Outcome QA Site

A deterministic Node.js + Express test fixture for exercising crawler URL outcomes.

## Routes

| Route | HTTP behavior | Intended test |
|---|---:|---|
| `/valid` | 200 | Normal URL continues through pipeline |
| `/not-found` | 404 | `crawler.http_error` |
| `/redirect` | 302 -> `/valid` | `crawler.redirected` |
| `/excluded/page` | 200 | Configure `/excluded/*` as an exclusion |
| `/parser-invalid` | 200 + malformed PDF bytes | Controlled parser-failure candidate |
| `/indexer-rejection` | 200 | Fixture for controlled Solr rejection |
| `/sanitize?email=test@example.com&token=qa-secret-123` | 200 | URL/diagnostic sanitization check |
| `/robots.txt` | 200 Allow all | Crawling allowed while app is awake |
| `/healthz` | 200 JSON | Render health check |

## Local run

```bash
npm install
npm start
```

Open http://localhost:3000.

## Render settings

- Service type: Web Service
- Runtime: Node
- Build command: `npm install`
- Start command: `npm start`
- Health check: `/healthz`

The included `render.yaml` can also be used as a Render Blueprint.

## Important Render Free-tier note

Free Render web services can spin down after inactivity. When a Free service is asleep,
Render may answer `/robots.txt` itself rather than running this application's route.
For reliable crawler QA, use an always-on instance or open the site root just before
starting the crawler, confirm `/healthz` works, and then start the crawl.

## Studio QA setup

1. Use the deployed root URL as the crawler start URL.
2. Add an exclusion rule matching `/excluded/*`.
3. Run the crawler.
4. Copy the application ID and crawl run ID.
5. In Datadog search for:

```
@event:operational.outcome.recorded @app_id:"<APP_ID>" @crawl_id:"<CRAWL_ID>"
```

Expected Crawler cases:

- `/not-found`: `service:crawler`, `outcome:FAILED`, `issue_code:crawler.http_error`
- `/redirect`: `service:crawler`, `outcome:REDIRECTED`, `issue_code:crawler.redirected`
- `/excluded/page`: `service:crawler`, `outcome:EXCLUDED`, `issue_code:crawler.configured_exclusion`

For each standardized event verify `schema_version=1.0`, `finality=FINAL`, and the
tenant/application/crawl-definition/crawl identifiers.

## Parser and Indexer caveat

The website can supply controlled inputs, but it cannot guarantee which internal
failure branch the Parser or Indexer takes.

- `/parser-invalid` returns malformed PDF bytes. Confirm that staging interprets
  this exact fixture as `parser.processing_failed`.
- `/indexer-rejection` exposes `qa_number=NOT_A_NUMBER`. Configure a QA Solr mapping
  or use the Indexer team's controlled rejection mechanism to deterministically
  produce `indexer.processing_failed`.

Do not use production applications or real sensitive data for these failure tests.
