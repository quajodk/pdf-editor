# PDF Editor

A browser-based PDF editor: open a PDF, edit native text in place (with bold/
italic, alignment, drag/move, resize), add new text and annotations (pen,
shapes, highlights, images), search with visual highlights, and save the
result back out as a PDF. Everything happens client-side via PDF.js + pdf-lib;
the bundled Node backend is a forward-looking file-hosting stub.

## Stack

- **Frontend** — React 18 + TypeScript, Tailwind CSS, Zustand store,
  react-pdf (rendering) + pdf-lib (writing). Bootstrapped from Create React
  App.
- **Backend** — Node 20 + Express + multer. Currently scaffolded for file
  upload but not exercised by the frontend. Designed to deploy to Fly.io or
  Cloud Run.
- **CI** — GitHub Actions for backend (Fly.io and/or Cloud Run) and frontend
  (Cloudflare Pages).

## Features

- **Inline PDF text editing** — click any paragraph of the original PDF in
  *Edit Text* mode and replace its contents. The original is covered with a
  white rectangle and the new text is re-drawn with the closest matching
  standard font (Helvetica / Times / Courier, with bold + italic variants
  picked from the source). Multi-line edits word-wrap to the original column
  width.
- **Bold / italic toggle** in the edit modal. Detected automatically from
  the source PDF's font name when possible.
- **Drag-to-move and resize** the source and edited blocks. The white
  cover stays pinned at the original location, so moving an edit never
  uncovers the original PDF text.
- **Add new text** (text tool) anywhere on the page.
- **Drawing tools** — pen, rectangle, circle, line, arrow, highlight,
  eraser, and image upload.
- **Search** with case-insensitive substring match and visible highlights;
  next/prev navigation scrolls the current result into view.
- **Pages** — multi-page navigation, page thumbnails, page delete, rotate,
  reorder.
- **Multiple open documents** with file tabs.
- **Dark mode** toggle.
- **Undo / redo** with a full history stack.
- **Save** as a new PDF (`<name>_edited.pdf`) or **Print** with all
  annotations baked in.
- **Leave-confirmation prompt** when refreshing or closing while a PDF is
  loaded.

## Quick start (local dev)

Requires Node 18+ (Node 20 recommended) and npm.

```bash
# from the repo root
./init.sh
```

`init.sh` installs both halves, kills anything on ports 3000/3001, starts
the backend on `:3001`, the frontend on `:3000`, and tails the logs.

Or manually:

```bash
# Backend
cd backend
npm install
npm start       # listens on :3001

# Frontend (in another terminal)
cd frontend
npm install
npm run dev     # opens http://localhost:3000
```

The frontend does NOT currently call the backend — all PDF rendering and
editing happens in the browser. The backend is wired for future server-side
features (persistence, server-side OCR, etc.).

## Environment variables

### Frontend

Vite only exposes variables that start with `VITE_` to the client bundle.
Copy `frontend/.env.example` to `frontend/.env.local`:

| Variable        | Purpose                                                  | Default                 |
| --------------- | -------------------------------------------------------- | ----------------------- |
| `VITE_API_URL`  | Base URL of the backend (forward-looking; unused today). | `http://localhost:3001` |

### Backend

Copy `backend/.env.example` to `backend/.env`:

| Variable        | Purpose                                                   | Default          |
| --------------- | --------------------------------------------------------- | ---------------- |
| `PORT`          | Port to listen on. Fly / Cloud Run inject this at deploy. | `3001`           |
| `CORS_ORIGINS`  | Comma-separated list of allowed origins. Set in prod.     | `*` (unset)      |

## Deployment (CI)

Three GitHub Actions workflows live in `.github/workflows/`. Each runs on
pushes to `main` / `master` that touch the relevant paths, and can be
triggered manually from the Actions tab.

### `deploy-backend-fly.yml`

Deploys `backend/` to Fly.io via `flyctl deploy`. Uses `backend/fly.toml`
for the app config.

| Required GitHub repo **secret** | Purpose                                             |
| ------------------------------- | --------------------------------------------------- |
| `FLY_API_TOKEN`                 | `flyctl auth token` value (org or personal token).  |

| Optional GitHub repo **variable** | Purpose                                                          |
| --------------------------------- | ---------------------------------------------------------------- |
| `FLY_APP`                         | Override the `app` name from `fly.toml` (for multi-env setups). |

Bootstrap once locally:

```bash
cd backend
flyctl launch                # accept the existing Dockerfile and fly.toml
flyctl secrets set CORS_ORIGINS=https://your-frontend.pages.dev
```

### `deploy-backend-cloudrun.yml`

Deploys `backend/` to GCP Cloud Run via `google-github-actions/deploy-cloudrun`
(which builds the container with Cloud Build from `backend/Dockerfile`).

| Required GitHub repo **secret** | Purpose                                                                |
| ------------------------------- | ---------------------------------------------------------------------- |
| `GCP_SA_KEY`                    | JSON key for a service account with the roles below. WIF is supported — swap the `auth@v2` step if you prefer it. |

Roles the service account needs:

- `roles/run.admin`
- `roles/iam.serviceAccountUser`
- `roles/cloudbuild.builds.editor`
- `roles/artifactregistry.writer`

| Required GitHub repo **variable** | Purpose                          |
| --------------------------------- | -------------------------------- |
| `GCP_PROJECT_ID`                  | GCP project id.                  |
| `CLOUD_RUN_SERVICE`               | Cloud Run service name.          |
| `CLOUD_RUN_REGION`                | e.g. `us-central1`.              |

| Optional GitHub repo **variable** | Purpose                                              |
| --------------------------------- | ---------------------------------------------------- |
| `CORS_ORIGINS`                    | Passed through to the service as a runtime env var. |

You can run either Fly OR Cloud Run, or both in parallel. They are
independent workflows.

### `deploy-frontend-cloudflare.yml`

Builds the React app and publishes `frontend/dist/` to Cloudflare Pages
via `cloudflare/wrangler-action`.

| Required GitHub repo **secret** | Purpose                                            |
| ------------------------------- | -------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`          | Token with the *Pages: Edit* permission.           |
| `CLOUDFLARE_ACCOUNT_ID`         | Your Cloudflare account id.                        |

| Required GitHub repo **variable** | Purpose                                          |
| --------------------------------- | ------------------------------------------------ |
| `CLOUDFLARE_PAGES_PROJECT`        | Pages project name (created once in the CF UI). |

| Optional GitHub repo **variable** | Purpose                                                                                                  |
| --------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `VITE_API_URL`                    | Inlined into the bundle at build time. Set to the deployed backend URL if/when the frontend talks to it. |

The frontend's `public/_redirects` ships an SPA fallback (`/* /index.html
200`) so deep links won't 404.

## Project layout

```
.
├── backend/                           Express server + Docker + Fly config
│   ├── src/server.js                  Routes (/api/health, /api/upload, ...)
│   ├── Dockerfile                     Shared image for Fly + Cloud Run
│   ├── fly.toml                       Fly.io app config
│   ├── .env.example                   Local-dev env var template
│   └── package.json
├── frontend/                          React app (Vite + TS + Tailwind)
│   ├── src/
│   │   ├── components/
│   │   │   ├── PDFEditor.tsx          Owns the file, runs extraction,
│   │   │   │                          implements save/print, search, the
│   │   │   │                          beforeunload guard, and drawTextEdit
│   │   │   ├── PDFCanvas.tsx          Per-page canvas: tools, overlays
│   │   │   │                          (extracted source + textEdit), drag
│   │   │   │                          + resize, search highlight render
│   │   │   ├── Toolbar.tsx            Tool selection, font controls,
│   │   │   │                          zoom, search toggle
│   │   │   ├── SearchBar.tsx          Find UI (next/prev, count)
│   │   │   └── PageThumbnails.tsx     Side panel
│   │   ├── store/useEditorStore.ts    Zustand store (annotations, history,
│   │   │                              extracted text, search state, tool)
│   │   └── types/index.ts             Annotation / SearchResult / etc.
│   ├── index.html                     Vite HTML entry
│   ├── public/_redirects              Cloudflare Pages SPA fallback
│   ├── .env.example                   VITE_* template
│   └── package.json
├── .github/workflows/
│   ├── deploy-backend-fly.yml
│   ├── deploy-backend-cloudrun.yml
│   └── deploy-frontend-cloudflare.yml
├── screenshots/                       Manual-test artefacts
├── tests/                             Puppeteer smoke tests
├── claude-progress.txt                Per-session change log + architecture
│                                      gotchas. Read before refactoring.
├── init.sh                            One-shot dev launcher
└── README.md
```

## Architecture notes worth knowing

Three load-bearing invariants survive end-to-end. Read these before
touching the editor (or skim `claude-progress.txt` Session 63 for the war
stories).

1. **Display position vs cover position.** `ExtractedTextItem.original*`
   (immutable, captured at extraction) is the white-cover region. The
   live `x/y/width/height` is where the edited text RENDERS. Dragging an
   edit changes the display, never the cover — otherwise the original PDF
   text becomes visible again. The save renderer (`drawTextEdit` in
   `PDFEditor.tsx`) and the in-editor overlay both honour this split.

2. **One `TextEditAnnotation` per source paragraph.** The submit handler
   finds an existing annotation for the same `originalTextId` (or via
   `reeditingAnnotationId` set by an overlay click) and `updateAnnotation`s
   it in place. Stacking two annotations on the same source would draw
   the cover twice and the final text twice.

3. **Z-index layering.** `react-pdf`'s text layer sits at z:2 and its
   annotation layer at z:3, both with `pointer-events: auto`. Without an
   explicit z-index, the PDFCanvas drawing surface would stack below them
   and every click would be eaten by a text-layer span. The current stack:

   ```
   1000  modals (text input, edit modal)
    999  resize preview
     10  blue source overlay (editText only)
      7  search highlights
      6  green textEdit shell
      5  PDFCanvas drawing surface
      4  white textEdit cover
      3  react-pdf annotation layer
      2  react-pdf text layer
   auto  Page canvas image
   ```

   Native PDF text selection is intentionally disabled by putting the
   drawing surface above the text layer. The app's own Edit Text mode is
   the selection/edit path.

A few more, briefly:

- **`pointer-events` does NOT inherit.** Any visual-only child of an
  event-capturing shell must set its own `pointerEvents: 'none'`.
- **PDF.js's `item.fontName` is opaque** (`g_d0_f1`). Use
  `textContent.styles[fontName].fontFamily` and strip the `[A-Z]{6}+`
  PDF subset prefix to read the real family for bold/italic detection.
- **pdf-lib has no underline.** Underline support would need a manual
  stroke drawn under each `drawText` call at `font.widthOfTextAtSize`.
- **Multi-item search matches are not currently found.** PDF.js often
  splits text into many small text items; the search walks each item
  independently. Per-item matches cover the vast majority of queries.

## Manual test artefacts

`tests/` contains ~80 Puppeteer smoke tests that screenshot the app at
various states (`screenshots/`). They catch toolbar / tab regressions
but do NOT diff the saved PDF against expectations, so they did not
catch the editText render bugs that Session 63 fixed. A snapshot test
for the rendered output is a good next step.

## Acknowledgements

- [react-pdf](https://github.com/wojtekmaj/react-pdf) for rendering.
- [pdf-lib](https://pdf-lib.js.org/) for writing.
- [pdfjs-dist](https://github.com/mozilla/pdf.js) for text extraction.
- [Zustand](https://github.com/pmndrs/zustand) for state.
