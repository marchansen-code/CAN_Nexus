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

### Verbesserungen (Iteration 7)
- ✅ PDF-Duplikat-Prüfung (409 Error mit force=true Override)
- ✅ PDF-Einbettung funktioniert (Content-Disposition: inline)
- ✅ Dashboard: 15 "Zuletzt angesehen" mit Scroll (5 sichtbar)
- ✅ KI-Suche präziser (Keyword-Filtering, Relevanz-Badges)

## API Endpoints

### Documents (neu/aktualisiert)
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
- Backend: 100% (15/15 Tests)
- Frontend: 100%
- Last tested: 20.02.2026

## Backlog

### P1 (High)
- [ ] Bild-Extraktion aus PDFs
- [ ] OCR für gescannte PDFs

### P2 (Medium)
- [ ] Artikel-Versionierung
- [ ] Export zu Word/PDF
- [ ] Schnellsuche (Strg+K)

### P3 (Nice to Have)
- [ ] Mehrsprachige UI
- [ ] Analytics Dashboard
