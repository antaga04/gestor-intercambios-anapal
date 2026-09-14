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

| `type`     | Meaning                                                | `quantity` means         | `details`                             | Cross-field rules                                                                 |
| ---------- | ------------------------------------------------------ | ------------------------ | ------------------------------------- | --------------------------------------------------------------------------------- |
| `billete`  | Whole billetes (10 décimos each) of one número         | nº de billetes, 1–192    | `{ serieFrom?, serieTo? }`            | both or none; `serieFrom ≤ serieTo`; `serieTo − serieFrom + 1 === quantity`       |
| `decimo`   | Exactly one décimo                                     | always 1                 | `{ serie?, fraccion? }`               | both or none                                                                      |
| `decimos`  | Several décimos of the same número (any serie/fracción) | nº de décimos, 2–1919    | `{ items?: { serie, fraccion }[] }`   | if present: unique pairs, `items.length === quantity`                             |

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

| Transition            | Who        | Preconditions                                                                                         | Side effects                                                                                     |
| --------------------- | ---------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| create (draft)        | owner (`from`) | `to` active user ≠ me; no existing `(campaign, from, to)`; before deadline                         | link `counterpart` if `to → from` exists (and back-link it)                                       |
| edit (rows/note)      | owner      | status ∈ {draft, pending, accepted}; before deadline                                                  | if was `accepted` → status `pending`, `respondedAt` cleared, `seenByReceiverAt` cleared          |
| send                  | owner      | status draft; ≥ 1 valid row                                                                           | status `pending`, `sentAt`                                                                       |
| cancel                | owner      | status pending                                                                                        | status `cancelled`                                                                               |
| delete                | owner      | status ∈ {draft, rejected, cancelled}; or pending/accepted before deadline (confirm dialog)           | remove doc; clear `counterpart` on the reverse doc                                               |
| accept                | receiver (`to`) | status pending; before deadline                                                                  | status `accepted`, `respondedAt`                                                                 |
| reject                | receiver   | status pending                                                                                        | status `rejected`, `respondedAt`, optional `rejectReason`                                        |
| seen                  | receiver   | any status, first open                                                                                | `seenByReceiverAt` if empty                                                                      |
| admin edit/delete     | admin+     | any                                                                                                   | same as owner, deadline ignored                                                                  |

A `rejected` or `cancelled` exchange can be edited by the owner and re-sent (goes back to `pending`) — simpler than forcing a new document, and the unique index stays satisfied.

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
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 20) return null;
  const d = digits.slice(0, 20);

  const numero = d.slice(11, 16);
  if (!/^\d{5}$/.test(numero)) return null;

  const dia = d[0] === "6" ? "Jueves" : d[0] === "5" ? "Sábado" : null;

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
    numero: string;            // 5 digits
    serie: string;             // "1".."192"
    fraccion: string;          // "1".."10"
    jornada: string;           // draw number within the year
    dia: 'Jueves' | 'Sábado' | null;
}
```

Digit layout of the 20-digit code (0-based positions):

| Positions | Length | Field                     |
| --------- | ------ | ------------------------- |
| 0         | 1      | Day code: `6` Jueves, `5` Sábado |
| 1–3       | 3      | Jornada                   |
| 4         | 1      | (unused by the decoder)   |
| 5–6       | 2      | Fracción                  |
| 7–9       | 3      | Serie                     |
| 10        | 1      | (unused)                  |
| 11–15     | 5      | Número                    |
| 16–19     | 4      | (unused)                  |

Tests (`shared/src/__tests__/decodeDecimo.test.ts`): a fixture set of raw strings (with and without separators, longer than 20 digits, shorter than 20, non-digit noise) and expected outputs; `null` cases.

`campaign.barcode` (`{ dayDigit, jornada }`): when set, a scan whose `dia`/`jornada` don't match yields the warning `scan.campaign_mismatch` ("Este décimo no parece ser del sorteo de esta campaña") but is still usable.

## 5. Scanning

Two input sources produce the same `DecimoDecodificado`, then `mergeScanIntoRow` (pure, `shared/src/lottery/rows.ts`) applies it to the row being edited.

### 5.1 Hardware barcode scanner (keyboard wedge)

`client/src/hooks/useBarcodeScanner({ enabled, onScan })`:
- Global `keydown` listener while the row editor is open and `enabled`.
- Buffers printable characters; a burst is accepted when ≥ 20 digits arrive with < 50 ms between keys and ends with `Enter` (or 120 ms of silence). Human typing never satisfies this.
- Clears the buffer on timeout; ignores events when focus is in a `textarea`.
- Calls `onScan(decodeDecimo(buffer))`; shows toast `scan.unreadable` if decoding fails.
- UI shows a small "Escáner listo" indicator with a pulse on each accepted scan.

### 5.2 Device camera

`CameraScannerDialog` (shadcn `Dialog`):
- Uses native `BarcodeDetector` when `('BarcodeDetector' in window)`, else `@zxing/browser` `BrowserMultiFormatReader` with hints for `ITF`, `CODE_128`, `EAN_13` (décimo barcodes are 1D; keep hints broad).
- `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })`, camera selector if several.
- Debounces identical reads (same raw within 1.5 s). Beep + haptic (`navigator.vibrate`) on success.
- "Modo continuo" toggle: keep the dialog open and keep scanning (useful for `decimos` and `billete` ranges).

### 5.3 Scan → row behaviour (by selected row type)

`mergeScanIntoRow(row: RowDraft, scan: DecimoDecodificado): { row: RowDraft; event: ScanEvent }`

| Selected type | Scan of numero N                                                                                                                                                                        |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `billete`     | Row empty → `numero = N`, `serieFrom = serie`, `quantity = 1`, `serieTo` unset (event `series_start`). Same N again → `serieFrom = min`, `serieTo = max` of the two, `quantity = to − from + 1` (event `series_end`). A third scan restarts the range with that serie. Fracción ignored. |
| `decimo`      | `numero = N`, `serie`, `fraccion`, `quantity = 1` (event `set`). A second scan overwrites.                                                                                              |
| `decimos`     | Row empty → `numero = N`, `items = [{serie, fraccion}]`, `quantity = 1`. Same N → append if pair not present (event `appended`), else event `duplicate` (toast "Ya has escaneado este décimo"). `quantity = items.length`. |
| any           | Different numero than the current row → the editor commits the current row (if valid) and opens a new row of the same type with the scan applied (event `new_row`). If the current row is invalid, toast `scan.finish_row_first`. |

Scanned values pre-fill the same inputs the user could type, so manual correction is always possible.

## 6. "Mi lotería" import

- Input: file `.csv`/`.txt` or pasted text. One número per line: `numero` or `numero;serieDesde;serieHasta` (also accepts `,` and tab). Numbers shorter than 5 digits are left-padded with zeros (`7` → `00007`) — shown in the preview so the user can confirm.
- Client parses with papaparse, validates each line with `lotteryNumberSchema`, shows a preview table with per-line errors, then `POST /lottery/import` in chunks of 1000.
- Server upserts on `(user, campaign, numero)`, merging `series` ranges (union, normalised and sorted).
- Manual add/remove rows in the same page; "Vaciar lista" clears the campaign's list.

## 7. Control list ("Lista de control")

`buildControlList(exchanges: ExchangeSummary[], meId): ControlList` in `shared/src/lottery/controlList.ts`, pure and tested. Input = all my live exchanges in the campaign (both directions) with populated counterpart public user.

```ts
interface ControlListRow {
    counterpart: PublicUser;
    gives:    { exchangeId; status; decimos } | null;   // my outgoing to them
    receives: { exchangeId; status; decimos } | null;   // their outgoing to me
    direction: 'da' | 'recibe' | 'ambos';
}
interface ControlList {
    rows: ControlListRow[];                              // sorted by counterpart.receptorNumber
    totals: {
        envelopesToSend: number;      // count(gives, status ∈ {pending, accepted})
        envelopesToReceive: number;   // count(receives, status ∈ {pending, accepted})
        decimosOut: number; decimosIn: number;
        drafts: number;               // outgoing drafts not yet sent (shown as a reminder)
    };
}
```

Rendered as a table (`/lista-control`), exported as CSV (`;` separator, UTF-8 BOM) and PDF (see 8), and available to admins for any user.

## 8. PDFs (client-side, `pdf-lib`)

`client/src/features/pdf/`:

- `envelopePdf.ts`: loads `/sobre-template.pdf` once (cached `ArrayBuffer`), copies page 1, draws text with `Helvetica-Bold` at coordinates from `envelopeLayout.ts`:
  ```ts
  export const ENVELOPE_LAYOUT = {
      destinatario: { receptorNumber: { x, y, size: 16 }, poblacion: { x, y, size: 14 }, provincia: { x, y, size: 14 } },
      remitente:    { receptorNumber: { x, y, size: 11 }, poblacion: { x, y, size: 10 }, provincia: { x, y, size: 10 } },
  };
  ```
  Coordinates are calibrated once against the template (pdf-lib origin is bottom-left; page is A4 portrait). Long strings are shrunk to fit the box width.
- `sheetPdf.ts` ("Hoja de intercambio", page 2): campaign name, fecha `dd/MM/yyyy`, REMITENTE/DESTINATARIO blocks, table of rows (`Número | Tipo | Cantidad | Series / Fracciones | Firmado`), totals in billetes and décimos, note, signature line.
- `exchangePdf(exchange, from, to)` → `Uint8Array` (envelope + sheet). Preview in an `<iframe src={blobUrl}>` inside a dialog; download as `sobre-<receptorTo>-<numeroReceptorFrom>.pdf`.
- `mergeExchangePdfs(list)` → one PDF with all outgoing exchanges (status pending/accepted) of the campaign, sorted by counterpart receptor number. Button "Descargar todos los sobres" in `/lista-control` and `/intercambios`. Option "Solo sobres" (skip sheets) for pure envelope printing.
- `controlListPdf(controlList, me, campaign)` → A4 landscape table.

Downloads use a blob + `<a download>` click (normal browser download).

## 9. Deadline rule

`campaign.exchangeDeadline` passed ⇒ for role `user`: create/edit/send/accept/reject/cancel/delete return `403 campaign.closed`; viewing, PDFs and control list remain available. Admins are exempt. The client hides mutating buttons and shows a banner "El plazo de intercambio terminó el dd/MM/yyyy".
