# 03 — Domain logic

Pure rules live in `@anapal/shared` (`shared/src/lottery/*`) so client and server behave identically and can be unit-tested with vitest. Persistence and permission checks live in `server/src/api/services/*`.

## 1. Amounts (base billete)

- Unit of storage: **décimos** (integer). 1 billete = 10 décimos.
- Display: billetes with one decimal and Spanish comma → `formatBilletes(24) === '2,4'`; with unit → `'2,4 billetes'`. Décimos shown as integers when useful (`'24 décimos'`).

```ts
// shared/src/lottery/amounts.ts
export const DECIMOS_PER_BILLETE = 10;
export const rowAmountDecimos = (row: { type: RowType; quantity: number }) =>
    row.type === 'billete' ? row.quantity * DECIMOS_PER_BILLETE : row.quantity;
export const exchangeTotalDecimos = (rows) => rows.reduce((acc, r) => acc + rowAmountDecimos(r), 0);
export const toBilletes = (decimos: number) => decimos / DECIMOS_PER_BILLETE;
export const formatBilletes = (decimos: number) =>
    new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(toBilletes(decimos));
```

Server recomputes `amountDecimos`/`totalDecimos` on every save; client values are display-only.

## 2. Row types and validation

| `type`    | Meaning                                                 | `quantity` means      | `details`                           | Cross-field rules                                                           |
| --------- | ------------------------------------------------------- | --------------------- | ----------------------------------- | --------------------------------------------------------------------------- |
| `billete` | Whole billetes (10 décimos each) of one número          | nº de billetes, 1–192 | `{ serieFrom?, serieTo? }`          | both or none; `serieFrom ≤ serieTo`; `serieTo − serieFrom + 1 === quantity` |
| `decimo`  | Exactly one décimo                                      | always 1              | `{ serie?, fraccion? }`             | both or none                                                                |
| `decimos` | Several décimos of the same número (any serie/fracción) | nº de décimos, 2–1919 | `{ items?: { serie, fraccion }[] }` | if present: unique pairs, `items.length === quantity`                       |

Common: `numero` matches `^\d{5}$`; serie 1–192; fracción 1–10; `numero` unique per exchange; `signed` boolean.

`validateRow(row): RowIssue[]` in `shared/src/lottery/rows.ts` returns structured issues (`{ path, code }`) used both by zod `superRefine` and by inline editor hints. Codes: `row.numero_invalid`, `row.quantity_out_of_range`, `row.series_incomplete`, `row.series_order`, `row.series_count_mismatch`, `row.items_count_mismatch`, `row.items_duplicate`, `row.duplicate_numero`.

### Warnings from "Mi lotería" (non-blocking)

When the user has at least one `LotteryNumber` for the active campaign:

- Row número not in the list → warning `lottery.numero_not_owned` ("No tienes este número en tu lotería").
- Row has series and the list has `series` ranges for that número but the row's series fall outside → warning `lottery.serie_not_owned`.
  If the list is empty, no check is performed (brief: "if no list, no check").

Client evaluates this locally against `GET /lottery` (cached by TanStack Query). Server does not block on it.

## 3. Exchange lifecycle

```
                 ┌──────────┐  send   ┌──────────┐  accept  ┌──────────┐
  create ──────▶ │  draft   │ ──────▶ │ pending  │ ───────▶ │ accepted │
                 └──────────┘         └──────────┘          └──────────┘
                      │  delete           │  │ reject            │ edit (owner)
                      ▼                   │  ▼                    ▼
                   (gone)                 │ rejected           pending (re-acceptance)
                                          │ cancel (owner)
                                          ▼
                                       cancelled
```

| Transition        | Who             | Preconditions                                                                               | Side effects                                                                            |
| ----------------- | --------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| create (draft)    | owner (`from`)  | `to` active user ≠ me; no existing `(campaign, from, to)`; before deadline                  | link `counterpart` if `to → from` exists (and back-link it)                             |
| edit (rows/note)  | owner           | status ∈ {draft, pending, accepted}; before deadline                                        | if was `accepted` → status `pending`, `respondedAt` cleared, `seenByReceiverAt` cleared |
| send              | owner           | status draft; ≥ 1 valid row                                                                 | status `pending`, `sentAt`                                                              |
| cancel            | owner           | status pending                                                                              | status `cancelled`                                                                      |
| delete            | owner           | status ∈ {draft, rejected, cancelled}; or pending/accepted before deadline (confirm dialog) | remove doc; clear `counterpart` on the reverse doc                                      |
| accept            | receiver (`to`) | status pending; before deadline                                                             | status `accepted`, `respondedAt`                                                        |
| reject            | receiver        | status pending                                                                              | status `rejected`, `respondedAt`, optional `rejectReason`                               |
| seen              | receiver        | any status, first open                                                                      | `seenByReceiverAt` if empty                                                             |
| admin edit/delete | admin+          | any                                                                                         | same as owner, deadline ignored                                                         |

A `rejected` or `cancelled` exchange can be re-sent as it is (`send` accepts those statuses, clearing the previous answer) or edited first — editing resets it to `draft`. Simpler than forcing a new document, and the unique index stays satisfied.

**Drafts are private to their sender.** The receiver cannot open one (403 `exchange.forbidden`), incoming lists filter them out, and `counterpartStatus` is hidden from the other party while the reverse exchange is still a draft — otherwise an unsent envelope would leak.

### Direction of a pair (computed)

For users A and B in a campaign, with `live = status ∈ {draft, pending, accepted}`:

- only A→B live → from A's view **Da**, from B's view **Recibe**
- only B→A live → the opposite
- both live → **Ambos** (bidireccional)

Implemented in `shared/src/lottery/controlList.ts` (`pairDirection`) and used by lists, detail badges and the control list.

### Inbox

`GET /exchanges/inbox` = `to = me AND status = 'pending'` in the active campaign, sorted by `sentAt` desc. Unread = `seenByReceiverAt == null`. Sidebar badge shows the pending count (`GET /dashboard` returns it too).

## 4. Barcode decoding (provided by the user — keep verbatim)

`shared/src/lottery/decodeDecimo.ts`:

```ts
export function decodeDecimo(raw: string): DecimoDecodificado | null {
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 20) return null;
    const d = digits.slice(0, 20);

    const numero = d.slice(11, 16);
    if (!/^\d{5}$/.test(numero)) return null;

    const dia = d[0] === '6' ? 'Jueves' : d[0] === '5' ? 'Sábado' : null;

    return {
        numero,
        serie: String(Number(d.slice(7, 10))),
        fraccion: String(Number(d.slice(5, 7))),
        jornada: String(Number(d.slice(1, 4))),
        dia,
    };
}
```

```ts
export interface DecimoDecodificado {
    numero: string; // 5 digits
    serie: string; // "1".."192"
    fraccion: string; // "1".."10"
    jornada: string; // draw number within the year
    dia: 'Jueves' | 'Sábado' | null;
}
```

Digit layout of the 20-digit code (0-based positions):

| Positions | Length | Field                            |
| --------- | ------ | -------------------------------- |
| 0         | 1      | Day code: `6` Jueves, `5` Sábado |
| 1–3       | 3      | Jornada                          |
| 4         | 1      | (unused by the decoder)          |
| 5–6       | 2      | Fracción                         |
| 7–9       | 3      | Serie                            |
| 10        | 1      | (unused)                         |
| 11–15     | 5      | Número                           |
| 16–19     | 4      | (unused)                         |

Tests (`shared/src/__tests__/decodeDecimo.test.ts`): a fixture set of raw strings (with and without separators, longer than 20 digits, shorter than 20, non-digit noise) and expected outputs; `null` cases.

`campaign.barcode` (`{ dayDigit, jornada }`): when set, a scan whose `dia`/`jornada` don't match yields the warning `scan.campaign_mismatch` ("Este décimo no parece ser del sorteo de esta campaña") but is still usable.
Implemented as `scanMatchesCampaign(scan, barcode)` next to the decoder (leading zeros in `jornada` are tolerated); `describeScan(scan)` renders the `numero · serie X · fracción Y` line used by every scan toast.

## 5. Scanning

Two input sources produce the same `DecimoDecodificado`, then `mergeScanIntoRow` (pure, `shared/src/lottery/rows.ts`) applies it to the row being edited.

### 5.1 Hardware barcode scanner (keyboard wedge)

`client/src/hooks/useBarcodeScanner({ enabled, onScan })`:

- Global `keydown` listener (capture phase) while the row editor is open and `enabled`.
- Buffers printable characters; a burst is accepted when ≥ 20 digits arrive with ≤ 50 ms between keys and ends with `Enter`/`Tab` (or 120 ms of silence). Human typing never satisfies this. The burst rules are a pure state machine in `shared/src/lottery/keyboardWedge.ts` (`wedgeKey`, `wedgeEnd`, `WEDGE` thresholds), unit-tested; the hook only adds the DOM glue.
- A scanner types into whatever is focused, so the hook remembers the focused text input and its value when a burst starts and, once the burst proves to be a scan, restores that value (native setter + `input` event, flushed with `flushSync`) and swallows the terminator key. Bursts that turn out to be typing are left untouched. Ignores events when focus is in a `textarea`, when a modifier key is held, or while a dialog other than the camera one is open.
- Calls `onScan(decodeDecimo(buffer))`; shows toast `scan.unreadable` if decoding fails.
- UI (`ScannerStatus`) shows a small "Escáner listo" indicator with a pulse on each accepted scan and the "Cámara" button.

### 5.2 Device camera

`CameraScannerDialog` (shadcn `Dialog`):

- Uses native `BarcodeDetector` when `('BarcodeDetector' in window)`, else `@zxing/browser` `BrowserMultiFormatReader` with hints for `ITF`, `CODE_128`, `EAN_13` (décimo barcodes are 1D; keep hints broad).
- `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })`, camera selector if several.
- Debounces identical reads (same raw within 1.5 s). Beep + haptic (`navigator.vibrate`) on success.
- "Modo continuo" toggle: keep the dialog open and keep scanning (useful for `decimos` and `billete` ranges).
- Loaded lazily (`React.lazy`) from `RowEditor`: ZXing is ~460 kB and only the camera path needs it. If the native detector exists but its first `detect()` rejects (browsers that expose the API without a backend), the dialog switches to ZXing on the fly. Permission/hardware errors show `scan.camera_unavailable`; a browser without `getUserMedia` shows `scan.camera_unsupported`.

### 5.3 Scan → row behaviour (by selected row type)

`mergeScanIntoRow<T extends ScanRow>(row: T, scan: ScanInput): { row: T; event: ScanEvent }` — generic over the flat `ScanRow` shape (`numero`, `type`, `quantity`, `serieFrom/To`, `serie`, `fraccion`, `items`) so the client's `RowDraft` passes through with its `key`/`signed`/`note` untouched. `describeScanEvent(event, row)` gives the toast title for each event.

| Selected type | Scan of numero N                                                                                                                                                                                                                                                                         |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `billete`     | Row empty → `numero = N`, `serieFrom = serie`, `quantity = 1`, `serieTo` unset (event `series_start`). Same N again → `serieFrom = min`, `serieTo = max` of the two, `quantity = to − from + 1` (event `series_end`). A third scan restarts the range with that serie. Fracción ignored. |
| `decimo`      | `numero = N`, `serie`, `fraccion`, `quantity = 1` (event `set`). A second scan overwrites.                                                                                                                                                                                               |
| `decimos`     | Row empty → `numero = N`, `items = [{serie, fraccion}]`, `quantity = 1`. Same N → append if pair not present (event `appended`), else event `duplicate` (toast "Ya has escaneado este décimo"). `quantity = items.length`.                                                               |
| any           | Different numero than the current row → the editor commits the current row (if valid) and opens a new row of the same type with the scan applied (event `new_row`). If the current row is invalid, toast `scan.finish_row_first`.                                                        |

The pure function only reports `new_row` together with the fresh row; `RowEditor` decides whether the previous row can be committed (`onCommit` returns `false` when the page rejects it, e.g. duplicate número, and the scan is then dropped with `scan.finish_row_first`). A `duplicate` event leaves the row untouched. Codes `scan.*` live in `messages/es.ts` next to the API codes so toasts share one dictionary.

Scanned values pre-fill the same inputs the user could type, so manual correction is always possible.

## 6. "Mi lotería" import

- Input: file `.csv`/`.txt` or pasted text. One número per line: `numero`, `numero;serie` or `numero;serieDesde;serieHasta` (`;`, `,`, tabs and spaces all work). Numbers shorter than 5 digits are left-padded with zeros (`7` → `00007`); blank lines and `#` comments are ignored; a número repeated in the file merges its series.
- Parsing lives in `shared/src/lottery/parseLotteryList.ts` (`parseLotteryList(text) → { rows, issues, mergedCount }`, unit-tested) rather than in a CSV library: the format has no quoting and the same parser must back both the preview and any future server-side import. The dialog shows the parsed preview plus the rejected lines with their line number and reason, then `POST /lottery/import` in chunks of `LIMITS.lotteryImportChunk` (1000).
- Server upserts on `(user, campaign, numero)`, merging `series` ranges through `mergeSeries`/`normalizeSeries` (sorted, overlapping **and adjacent** ranges collapsed: `40–74` + `75–90` → `40–90`). `replace: true` (only on the first chunk) wipes the campaign list first.
- Manual add/remove rows in the same page; "Vaciar lista" clears the campaign's list. Editing "Mi lotería" stays allowed after the exchange deadline — it is the admon's own stock list, not an exchange.

## 7. Control list ("Lista de control")

`buildControlList(exchanges: ExchangeSummary[], meId): ControlList` in `shared/src/lottery/controlList.ts`, pure and tested. Input = all my live exchanges in the campaign (both directions) with populated counterpart public user.

```ts
interface ControlListRow {
    counterpart: PublicUser;
    gives: { exchangeId; status; decimos } | null; // my outgoing to them
    receives: { exchangeId; status; decimos } | null; // their outgoing to me
    direction: 'da' | 'recibe' | 'ambos';
}
interface ControlList {
    rows: ControlListRow[]; // sorted by counterpart.receptorNumber
    totals: {
        envelopesToSend: number; // count(gives, status ∈ {pending, accepted})
        envelopesToReceive: number; // count(receives, status ∈ {pending, accepted})
        decimosOut: number;
        decimosIn: number;
        drafts: number; // outgoing drafts not yet sent (shown as a reminder)
    };
}
```

Rules: only live exchanges (draft/pending/accepted) form a row — rejected and cancelled ones are not envelopes; incoming drafts are ignored (unsent, private to the other admon); rows are sorted with `compareReceptor` (numeric collation, so `9` < `10`). `EXCHANGE_STATUS_LABELS` / `PAIR_DIRECTION_LABELS` live next to it for CSV/PDF text.

Rendered as a table (`/lista-control`), exported as CSV (`controlListToCsv`, `;` separator, UTF-8 BOM) and PDF (see 8), and available to admins for any user.

## 8. PDFs (client-side, `pdf-lib`)

`client/src/features/pdf/` (pdf-lib is imported dynamically, so it only loads when someone previews or downloads):

- `envelopeLayout.ts`: the template `/sobre-template.pdf` is **200 × 270 mm (567 × 765.36 pt), one page**, not A4. Each slot is `{ x, y, size, maxWidth }` (pdf-lib origin bottom-left, `y` = baseline) calibrated against the template's boxes:
    ```ts
    export const ENVELOPE_LAYOUT = {
        destinatario: {
            receptorNumber: { x: 190, y: 498, size: 16, maxWidth: 325 },
            poblacion: { x: 146, y: 455, size: 14, maxWidth: 370 },
            provincia: { x: 142, y: 409, size: 14, maxWidth: 374 },
        },
        remitente: {
            receptorNumber: { x: 411, y: 136, size: 11, maxWidth: 106 },
            poblacion: { x: 379, y: 103, size: 10, maxWidth: 138 },
            provincia: { x: 375, y: 69, size: 10, maxWidth: 142 },
        },
    };
    ```
    Long strings are shrunk (down to 6 pt) to fit `maxWidth`. Re-measure if the template changes.
- `text.ts`: `safeText` (standard fonts only know WinAnsi — accents, º/ª, – and · are fine; anything else, e.g. emoji, becomes `?` instead of throwing), `fitSize`, `truncate` (ellipsis), `wrap`, `drawText` (left/right/center). `table.ts`: `drawTable` draws a zebra grid with a repeated header and adds pages via `onNewPage`.
- `envelopePdf.ts`: `loadEnvelopeTemplate()` fetches the template once per session; `appendEnvelope(doc, from, to)` copies page 1 into `doc` and draws both blocks in `Helvetica-Bold`.
- `sheetPdf.ts`: `appendSheet(doc, exchange)` — "Hoja de intercambio" on A4: campaign name, fecha `dd/MM/yyyy`, REMITENTE/DESTINATARIO blocks (receptor, name, población/provincia, address · phone · contact), table `Número | Tipo | Cantidad | Series / fracciones | Sellado` (row notes appended to the details cell), totals line (filas · décimos · billetes · firmados), wrapped note (max 6 lines), two signature lines. Long lists continue on further pages with a "(continuación)" header.
- `exchangePdf.ts`: `exchangePdf(exchange, { onlyEnvelopes? })` → `Uint8Array` (envelope + sheet); `mergeExchangePdfs(exchanges, { onlyEnvelopes? })` → one PDF sorted by the receiver's receptor number (`compareReceptor`). With `onlyEnvelopes` summaries are enough; sheets need `ExchangeDetail` (rows). `exchangePdfFilename` → `sobre-<receptorTo>-<receptorFrom>.pdf`.
- `controlListPdf.ts`: `controlListPdf(list, me, campaignName)` → A4 landscape: header with my data and the date, totals line, table with Doy/Recibo in billetes plus their status and the direction.
- `hooks.ts`: `useExchangePdf()` (`previewExchange`, `downloadExchange`, `downloadAll({ onlyEnvelopes, campaignName })`, `preview` state for `PdfPreviewDialog`) and `useControlListDownloads()` (`pdf`, `csv`). `downloadAll` pages through `GET /exchanges?direction=out&status=pending|accepted` and fetches details (through the query cache) only when sheets are included. `PdfPreviewDialog` shows the bytes in an `<iframe>` with a download button.
- `download.ts`: blob + `<a download>` click; `downloadPdf`, `downloadCsv`, `slugify` for filenames (`sobres-<campaña>.pdf`, `lista-control-<campaña>.pdf/.csv`).

CSV export of the control list is `controlListToCsv` in shared (§7): UTF-8 BOM, `;` separators, CRLF, `formatBilletes` decimals, totals appended after a blank line. The same function backs `GET /exchanges/control-list?format=csv`.

## 9. Deadline rule

`campaign.exchangeDeadline` passed ⇒ for role `user`: create/edit/send/accept/reject/cancel/delete return `403 campaign.closed`; viewing, PDFs and control list remain available. Admins are exempt. The client hides mutating buttons and shows a banner "El plazo de intercambio terminó el dd/MM/yyyy".
