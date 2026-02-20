# CANUSA Nexus - The Knowledge Hub - PRD

## Original Problem Statement
KI-gestützte Wissensmanagement-Plattform für CANUSA Touristik GmbH & Co. KG und CU-Travel.

## Technology Stack
- **Frontend**: React 18, TailwindCSS, Shadcn/UI, TipTap Rich Editor
- **Backend**: FastAPI, Python 3.11
- **Database**: MongoDB, Pinecone (Vektoren)
- **AI**: Gemini 3 Flash (Emergent LLM Key)
- **Auth**: Emergent-managed Google OAuth

## Implemented Features

### Core Features
- ✅ Google Auth mit Domain-Beschränkung (@canusa.de, @cu-travel.com)
- ✅ Dashboard mit Statistiken, Favoriten, Beliebteste Artikel
- ✅ KI-Suche mit Keyword + Semantischer Suche
- ✅ Artikel-CRUD mit Status-Workflow
- ✅ Kategorieverwaltung (Baumstruktur)
- ✅ Dark/Light/Auto Theme-Mode

### Admin Features
- ✅ User sperren und löschen
- ✅ Dokumente löschen
- ✅ Rollenverwaltung (Admin/Editor/Viewer)

### PDF Features
- ✅ PDF-Upload mit Duplikat-Prüfung
- ✅ PDF-Einbettung als iFrame (öffentlicher Endpoint)
- ✅ PDF in neuem Tab öffnen
- ✅ Text-Extraktion mit Layout-Erhaltung

### Iteration 7 (abgeschlossen)
- ✅ PDF-Duplikat-Prüfung (409 Error mit force=true Override)
- ✅ PDF-Einbettung funktioniert (Content-Disposition: inline)
- ✅ Dashboard: 15 "Zuletzt angesehen" mit Scroll (5 sichtbar)
- ✅ KI-Suche präziser (Keyword-Filtering, Relevanz-Badges)

### Iteration 8 (20.02.2026 - abgeschlossen)
- ✅ **Bild-Upload im Editor** (P0 Bug Fix)
  - Backend: `POST /api/images/upload` (PNG/JPEG/GIF/WebP, max 10MB)
  - Backend: `GET /api/images/{image_id}` (Public, cached)
  - Frontend: `handleImageUpload` in ArticleEditor.jsx
  - Frontend: `onImageUpload` prop an RichTextEditor übergeben
- ✅ **"Angemeldet bleiben" Feature** (P1)
  - Backend: `POST /api/auth/extend-session` (30 Tage / 7 Tage)
  - Frontend: Switch in Settings.jsx mit localStorage-Persistenz

## API Endpoints

### Images (NEU)
- `POST /api/images/upload` - Bild hochladen (Auth required)
- `GET /api/images/{image_id}` - Bild abrufen (Public, 1 Jahr Cache)

### Auth (erweitert)
- `POST /api/auth/extend-session` - Session verlängern (30d) oder zurücksetzen (7d)

### Documents
- `POST /api/documents/upload` - Upload (409 bei Duplikat, ?force=true zum Überschreiben)
- `GET /api/documents/{id}/pdf` - PDF für Auth-User
- `GET /api/documents/{id}/pdf-embed` - PDF für iFrame (public, inline)
- `DELETE /api/documents/{id}` - Löschen (Admin only)

### Users
- `DELETE /api/users/{id}` - User löschen (Admin only)
- `PUT /api/users/{id}/block` - User sperren/entsperren

### Search
- `POST /api/search` - Suche mit Keyword-Filtering und Snippet-Highlighting

### Stats
- `GET /api/stats` - Enthält 15 recently_viewed Artikel

## Test Coverage
- Backend: 100% (12/12 Tests für Iteration 8)
- Frontend: 100%
- Last tested: 20.02.2026

## Backlog

### P1 (High)
- [ ] AI-Suche Präzision verbessern (Re-Ranking, Gewichtung)
- [ ] Hierarchische Kategorie-Verwaltung UI (Add/Edit/Delete)
- [ ] Bild-Extraktion aus PDFs
- [ ] OCR für gescannte PDFs

### P2 (Medium)
- [ ] High-Fidelity PDF-Import (Tabellen → editierbares HTML)
- [ ] Artikel-Versionierung
- [ ] Export zu Word/PDF
- [ ] Schnellsuche (Strg+K)
- [ ] Backend Refactoring (server.py in Router aufteilen)

### P3 (Nice to Have)
- [ ] Mehrsprachige UI
- [ ] Analytics Dashboard

## Known Issues (Minor)
- TipTap Console-Warnung: "Duplicate extension names found" (nicht blockierend)
