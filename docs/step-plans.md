# Step plans: the tracker tells the extension what to do

Status: design, 2026-11-26. Pilot: `SCRAPE_EGIFT`.

## Why

Every flow change needs an extension build, a merge, a Brave clone update and a manual reload. On
11-26, diagnosing one eGift failure took three releases (1.3.9 → 1.4.0 → 1.4.1). Scrape config (1.4.0)
already moved selectors, labels, regexes, URLs and timeouts to the tracker. What is still compiled in is
the flow: which page to wait for, what to click, in what order, what to read and where to send it.

Goal: a page change or a reordered flow ships as a tracker deploy. A release is needed only for a new
host, a new step type, a new permission, or an interpreter bug.

## Constraint

MV3 forbids remote code. `chrome.scripting.executeScript` can only run functions bundled in the
extension; it can pass them data. So the tracker sends a **plan** (JSON), and the extension
**interprets** it with a fixed step vocabulary. Each step type is extension code. There is no eval, no
`Function`, no script strings, and no remote script.

## Shape

The tracker serves `GET /api/extension/plans`, the same way it serves scrape config: a version, an ETag,
a validator that is identical on both sides, and a bundled default copy in the extension. A command
names its plan (`SCRAPE_EGIFT` → plan `costcoEgift`). When the plan is missing, fails validation, or is
older than the bundled copy, the built-in runner (today's code) runs instead. The report says which
one ran: `runner: "plan v7"` or `"builtin"`.

```jsonc
{
  "version": 1,
  "plans": {
    "costcoEgift": {
      "hosts": ["www.memberedelivery.com"],        // must be within the bundled allowlist
      "inputs": ["link", "email"],                  // what the command payload provides
      "limits": { "steps": 400, "runMs": 300000 },  // capped again by the extension
      "steps": [
        { "id": "open",  "do": "open", "url": "$link" },
        { "id": "first", "do": "wait", "any": [
            { "when": { "exists": "#p2, input[type=email]" }, "go": "email" },
            { "when": { "clickable": "Access eGift" },        "go": "list" },
            { "when": { "label": "Code:" },                   "go": "cards" } ],
          "timeout": "page-timeout" },
        { "id": "email", "do": "fill", "selector": "#p2", "value": "$email", "submit": true },
        { "id": "list",  "do": "wait", "any": [ { "when": { "clickable": "Access eGift" }, "go": "titles" } ],
          "timeout": "email-no-response", "alert": "email-rejected" },
        { "id": "titles", "do": "read", "into": "titles", "all": "section.order-item .order-item-title" },
        { "id": "access", "do": "click", "clickable": "Access eGift", "follow": "new-tab-or-same", "retryKeepInTab": true },
        { "id": "cards", "do": "repeat", "max": 60, "steps": [
            { "do": "wait", "until": { "label": "Code:", "changed": true }, "timeout": "ended-early" },
            { "do": "read", "into": "card", "secret": ["code", "pin"],
              "fields": { "code": { "label": "Code:" }, "pin": { "label": "PIN:" }, "counter": { "selector": "#wdt-page-counter" } } },
            { "do": "shoot", "selector": "#print-content-section, #body-canvas", "into": "image" },
            { "do": "post", "to": "egift", "body": { "card": "$card", "titles": "$titles", "image": "$image" } },
            { "do": "stopIf", "when": { "counterAtEnd": "$card.counter" } },
            { "do": "click", "selector": "input[id$=wdt-nav-next]", "orText": "^next\\b", "else": "ended-early" } ] }
      ]
    }
  }
}
```

The `costcoEgift` scrape-config site moves into the plan, so a plan is self-contained.

## Step vocabulary (v1)

| Step | Does | Notes |
|---|---|---|
| `open` | Opens a background tab on `url` | URL from an input only; its host must pass the allowlist |
| `wait` | Polls until one of `any[].when` holds, then jumps to `go` | `timeout` and `alert` name the failure code; a bot check always fails as `bot-check` |
| `click` | Clicks by `selector`, by `clickable` label, or by `orText` regex | `follow` adopts a tab the portal opens (the opener rule from today) |
| `fill` | Sets an input's value and optionally submits | `value` comes from **inputs only**, never from a page read |
| `read` | Reads fields (by label, selector or regex) into a run variable | `secret` fields are never logged or reported |
| `shoot` | Photographs an element (debugger) | As in egiftShot today |
| `post` | Sends a body to a **named** tracker endpoint | Names map to a bundled list of `/api/extension/*` paths |
| `repeat`, `stopIf`, `go`, `fail` | Control flow | Loop and step counts are capped |

Conditions: `exists` (selector), `clickable` (label), `label` (labelled value present), `text` (body
regex), `changed` (differs from the last read), `counterAtEnd`. All run through one bundled page
function, like `pageText` today.

## Safety rules (enforced by the extension, not trusted from the plan)

1. **Hosts.** A plan may open and act only on hosts in a bundled allowlist (today's `host_permissions`
   minus the tracker). A plan cannot widen it. Tabs the user opened are never read, clicked or closed.
2. **Data flow.** Page reads can go only to the tracker, and only to the bundled endpoint names. `fill`
   and `open` take values only from the command inputs. A plan cannot copy text from one site into
   another site or into a URL.
3. **No code.** Selectors and regexes are data, compiled in try/catch. The only main-world script is the
   bundled `keepInTab`.
4. **Secrets.** Card codes, PINs, emails and links are never logged or reported. The report is counts,
   the step id that failed, and a failure code (as today), plus a step trace of ids and timings, with no
   values.
5. **Budgets.** Bundled caps on steps, loop iterations, run time and open tabs. The plan's own limits
   can only be lower.
6. **Versions.** Plans are monotonic and validated like scrape config. An invalid or older plan is
   never applied; the built-in runner runs instead.
7. **Who can send one.** The plan endpoint sits behind the shared secret (pairing, 1.4.4).

### Open risk: an action on an allowed site

Within an allowed host, a plan can click any button. A bad plan, or someone on the LAN tampering
with plain-HTTP traffic to the tracker, could click Cancel on an Amazon order. Two mitigations:

- **Action denylist (v1, cheap).** `click` refuses elements whose text matches a bundled pattern
  (cancel, delete, remove, place order, buy, pay, return, sign out). It is coarse but stops the
  costly mistakes.
- **Signed plans (recommended v2).** Plans are signed with Ed25519 (WebCrypto), and the extension
  bundles the public key. Someone tampering with LAN traffic cannot forge a signature. **Decision for
  Penn:** where the signing key lives. Recommended: a GitHub Actions secret, so CI signs
  `config/plans.json` when it builds the tracker image. A plan change is still only a tracker deploy.

## Diagnosis without a release

- Each run posts its step trace (ids, which condition matched, timings; no values) with the result,
  so a failure names the exact step and the page state flags it saw.
- `dryRun: true` on a command runs `open`, `wait`, `read` (non-secret fields) and `click` on
  navigation only. It skips `fill`, `post` and `shoot`, and reports the trace. This replaces
  "add logging, release, reload, retry".

## Testing

- The interpreter takes a tab driver interface. Node tests run plans against a fake driver that
  serves page states, the same way `egiftRun` could be tested but is not today.
- The validator and its fixtures are shared between the repos, as scrape config is.
- The pilot passes when the `costcoEgift` plan gives the same report as the built-in runner on a
  real order (counts, images, named, mismatched). Penn triggers that run; nobody edits cards.

## Rollout

1. Interpreter, validator, bundled `costcoEgift` plan, fake-driver tests. The built-in runner stays
   as the fallback. Extension 1.5.0.
2. Tracker: `config/plans.json`, `GET /api/extension/plans`, the same validator, trace storage and a
   trace view on the command log.
3. Pilot `SCRAPE_EGIFT` on one order, then make the plan the default. Keep the built-in runner for
   two releases.
4. Move `TRACK_CARRIER` and `VISIT_AMAZON`. Costco sync (GraphQL) needs a `fetchJson` step on an
   allowed host and is out of scope for v1.
5. v2: signed plans.

## Still a release

A new host or permission, a new step or condition type, an interpreter bug, and changes to the
safety caps.
