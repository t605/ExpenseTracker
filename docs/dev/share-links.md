# Share links: developer documentation

## Overview

Share links let a person send a read-only snapshot of a report to someone else without any server. The report is turned into
JSON, compressed, encoded as text and placed after the `#` in the address of the `/shared` page. Browsers never send the part
after `#` over the network, so the data travels only inside the link. The `/shared` page decodes the link, validates it
strictly (it is untrusted input), and shows the report as a table. A real, scannable QR code of the link is shown beside it.

## Files

| Path | Job |
| --- | --- |
| `lib/cloud/share.ts` | All pure logic: payload type, expiry, limits, validation, encoding and decoding, link building |
| `lib/cloud/state.ts` | Saved-state validation for the list of created links (`toShare`, `safeShareUrl`), the limits `MAX_SHARES` and `MAX_STORED_URL` |
| `lib/cloud/types.ts` | The `ShareRecord` type (one entry in the user's list of links) |
| `components/cloud/CloudProvider.tsx` | `createShare`, `revokeShare`, `removeShare`; keeps the list in state and in localStorage |
| `components/cloud/SharesTab.tsx` | The "Share links" tab: the form, the result card, the list of links |
| `components/cloud/QRCode.tsx` | Draws the QR code as one SVG path |
| `components/cloud/SharedViewer.tsx` | The page that opens a link: decode, check expiry and revocation, render, offer the CSV |
| `components/cloud/ReportTable.tsx` | Renders the table (shared with the export preview) |
| `app/shared/page.tsx` | The `/shared` route; only mounts `SharedViewer` |
| `tests/cloud.test.ts`, `tests/cloud-fixes.test.ts` | Unit tests |

## How it works

Creating a link (`SharesTab` -> `CloudProvider.createShare`):

1. `buildReport` builds the chosen report (template) from the current expenses and currency.
2. `createSharePayload` copies the report into a `SharePayload` and adds `id`, `created`, `exp`, `currency` and `dl`.
3. `checkShareable` applies the SAME limits the viewer applies (rows, size, field rules). On failure `createShare` throws an
   `Error` whose message is shown in the form.
4. `encodeShare` returns base64url text of the deflate-raw compressed JSON.
5. `decodeShare` is run on the result as a round trip. If it fails, `createShare` throws "The link could not be verified.
   Try a smaller report."
6. `buildShareUrl(window.location.origin, encoded, process.env.NEXT_PUBLIC_BASE_PATH ?? "")` makes the address.
7. A `ShareRecord` is added at the front of `state.shares` (newest first, at most `MAX_SHARES`). Its `url` is kept only if it is
   at most `MAX_STORED_URL` characters, otherwise it is stored as an empty string.

Opening a link (`SharedViewer`):

1. On mount, and on every `hashchange`, `decodeShare(window.location.hash)` runs.
2. If decoding fails, one of three notices is shown: "Shared report" (no data in the address), "Report too large", "This link
   does not work".
3. If `isExpired(p.exp, new Date())`, the notice "This link has expired" is shown and no data is displayed.
4. If this browser's own list has a share with the same `id` marked `revoked`, "This link was revoked" is shown.
5. Otherwise the title, the table (`ReportTable`) and, when `p.dl` is true, a "Download CSV" button (`tableToCSV`) are shown.

## Public API

`lib/cloud/share.ts`:

| Export | Signature and behaviour |
| --- | --- |
| `SharePayload` | Type. `v: 1`, `id`, `created`, `exp: string \| null`, `title`, `subtitle`, `currency`, `dl: boolean`, `fileBase`, `columns: string[]`, `rows: string[][]`, `footer: string[] \| null` |
| `ExpiryChoice` | `"1d" \| "7d" \| "30d" \| "never"` |
| `EXPIRY_LABELS` | Record from `ExpiryChoice` to the text shown on screen |
| `expiryFrom(choice, now)` | ISO time `choice` after `now`, or `null` for `"never"` |
| `isExpired(exp, now)` | `true` when `exp` is not `null` and is at or before `now` |
| `createSharePayload(report, opts)` | `opts`: `id`, `now`, `expiresAt`, `allowDownload`, `currency`. Returns a `SharePayload` |
| `validatePayload(raw)` | Returns a cleaned `SharePayload` or `null`. Copies only known fields. Also cleans `fileBase` |
| `checkShareable(payload)` | `{ ok: true }` or `{ ok: false; message }`. Rejects too many rows, too large, or invalid |
| `encodeShare(payload)` | `Promise<string>`. Throws `Error("report too large to share")` if the compressed output passes the size limit |
| `decodeShare(fragment)` | `Promise<DecodeResult>`. Never throws. Reasons: `"empty"`, `"invalid"`, `"too-large"` |
| `buildShareUrl(origin, encoded, basePath = "")` | `${origin}${basePath}/shared#${encoded}` |
| `isLocalOrigin(origin)` | `true` for localhost, 127.0.0.1 and `[::1]` |

`CloudProvider` (via `useCloud()`): `createShare({ template, expiry, allowDownload })` returns `Promise<{ record, url }>` and throws
an `Error` with a user-readable message. `revokeShare(id)` sets `revoked: true`. `removeShare(id)` deletes the entry.

`QRCode({ text, size = 208 })` renders an `<svg role="img">`, or an explanatory paragraph if the text does not fit in a QR code.

## State and storage

- The user's list of links is `state.shares` in the cloud state, saved under the localStorage key `expense-tracker:cloud:v1`
  (`CLOUD_STORAGE_KEY`). It is read in an effect and not written before the first successful read.
- On read, `sanitizeCloudState` keeps only valid entries (`toShare`), at most `MAX_SHARES` (10). `safeShareUrl` keeps a saved
  address only if it starts with `http://` or `https://` and is at most `MAX_STORED_URL` (20,000) characters; anything else
  becomes `""`.
- The data of a link itself is NOT stored anywhere on a server and is not read from localStorage when a link is opened. Only the
  revocation check reads the viewer's own list.

## Dependencies

- `qrcode-generator` (MIT, no dependencies): `qrcode(0, "L")`, `addData`, `make`, then the modules are drawn as one SVG path with a
  4-module quiet zone.
- Browser APIs: `CompressionStream` and `DecompressionStream` with `"deflate-raw"`, `Blob`, `TextEncoder`, `btoa` and `atob`.

## Security and privacy

- The viewer decodes attacker-controlled input. Defences: inflating stops at `MAX_DECODED_BYTES` (1,000,000), at most `MAX_ROWS`
  (5000) rows, `MAX_COLUMNS` (12) columns, `MAX_CELL` (400) characters per cell, title at most 100 and subtitle at most 200
  characters, a strict type check that copies only known fields, and React text nodes only (no `innerHTML`).
- `fileBase` is reduced to letters, digits, `_`, `.` and `-`, with no leading dot or dash, so a link cannot pick a harmful file name.
- The CSV download goes through `csvCell`, which prefixes `= + - @` cells with an apostrophe.
- By design anyone who has the link can read the report, a link cannot be recalled, and "Revoke" only works in the browser that
  created the link. The expiry is checked by the viewer page, so it is a courtesy and not a security control. The UI says so.

## Errors and edge cases

| Case | Handling |
| --- | --- |
| More than 5000 rows | `checkShareable` refuses with a message that names the count and suggests a summary report |
| Report larger than 1 MB as JSON | `checkShareable` refuses |
| A value the viewer would reject (such as a cell over 400 characters) | `checkShareable` refuses |
| Link cut off or damaged | `decodeShare` returns `invalid`; the viewer shows "This link does not work" |
| Link that inflates beyond the limit | `decodeShare` returns `too-large` |
| No data after `#` | `decodeShare` returns `empty`; the viewer explains what the page is for |
| QR cannot hold the link | `QRCode` shows a paragraph that says to use the link itself |
| Stored link too long | `url` stored as `""`; the list shows "Link too large to keep" |
| App on localhost | The tab warns that the link only opens on this computer (`isLocalOrigin`) |
| Hosted under a sub-folder | `NEXT_PUBLIC_BASE_PATH` is added by `buildShareUrl` |

## Tests

- `tests/cloud.test.ts`, `describe("share links")`: 8 tests (round trip with Hebrew and Cyrillic text, size, expiry, rejection of
  empty, garbage and truncated links, wrong shape, a decompression bomb, `validatePayload` limits, `buildShareUrl` and
  `isLocalOrigin`).
- `tests/cloud-fixes.test.ts`, `describe("checkShareable ...")`: 6 tests (accepts the maximum, refuses one row more, refuses by
  size, refuses a too-long cell, round trip for several sizes).
- `tests/cloud-fixes.test.ts`, saved state: 2 tests about share addresses (`safeShareUrl`, a saved `javascript:` link).
- Whole suite when this document was written: 81 tests in 4 files, all passing. Run with `npm run test`.
- NOT covered: `SharesTab`, `SharedViewer` and `QRCode` as components (the project has no component test setup), and real browser
  behaviour.

## Extending it

- New expiry option: add the key to `ExpiryChoice`, a label in `EXPIRY_LABELS`, a branch in `expiryFrom`, and the key to the
  `EXPIRIES` array in `SharesTab.tsx`. Add a test for the new date.
- New field in a link: add it to `SharePayload`, `createSharePayload` and `validatePayload` (with limits), and show it in
  `SharedViewer`. If old links must keep working, keep the old shape valid; if not, raise `v` and reject the old value.
- New report type: add the template in `lib/cloud/templates.ts` and `lib/cloud/catalog.ts`; links work for it without more changes
  because they carry a plain table.
- Real revocation or expiry would need a server that stores the links. That would replace the fragment design.

## Known limits

- A link is a snapshot: it never updates after it is created.
- Revocation and the list of links live only in the browser that created them.
- A link can only hold 5000 rows and about 1 MB of JSON; the QR code holds roughly 2,900 characters.
- There is no password.
- The list holds at most `MAX_SHARES` (10) entries. `createShare` slices to that limit, so creating an 11th link silently
  removes the oldest entry from the list (and with it the ability to revoke that link in this browser). The UI does not tell the
  user. This may be worth a notice if the limit is ever reached.
- The link only works where the app is hosted. On localhost it opens only on the same computer.

## History

- `176fbf9` Add simulated cloud export: templates, destinations, schedules, history, share links with QR
- `cbe2779` Prepare public release: GitHub Pages workflow, static export under a base path (adds `basePath` to `buildShareUrl`)
- `15e73bf` Fix issues found in QA review (adds `checkShareable`, the round trip, `safeShareUrl`)
- `7b5caa7` Format the code with Prettier (formatting only)

## Not verified

- Browser support for `CompressionStream` and `DecompressionStream` with `"deflate-raw"` in Safari and Firefox.
- Scanning the QR code with a real phone camera.
- Screen-reader behaviour of the tab, the result card and the notices.
