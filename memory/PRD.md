# CANUSA Nexus - The Knowledge Hub - PRD

## Original Problem Statement
KI-gestützte Wissensmanagement-Plattform für CANUSA Touristik GmbH & Co. KG und CU-Travel, spezialisiert auf automatisierten Content-Import und intelligente Abfrage.

## Technology Stack
- **Frontend**: React 18, TailwindCSS, Shadcn/UI, TipTap Rich Editor
- **Backend**: FastAPI, Python 3.11
- **Database**: MongoDB (Dokumente), Pinecone (Vektoren)
- **AI**: Gemini 3 Flash (Emergent LLM Key)
- **Auth**: Emergent-managed Google OAuth (Domain-restricted)

## Implemented Features

### Core Features
- ✅ Landing Page mit Google Auth Login
- ✅ Dashboard mit Statistiken, Neueste & Beliebteste Artikel
- ✅ KI-Suche mit Keyword + Semantischer Suche
- ✅ Artikel-CRUD mit Status-Workflow
- ✅ PDF-Upload und Verarbeitung
- ✅ Kategorieverwaltung (Baumstruktur)

### Phase 6 - Advanced Features
- ✅ **Dark/Light/Auto Theme-Mode** (Dropdown im Header)
- ✅ **Admin: Dokumente löschen**
- ✅ **Wissensartikel Split-Layout** (Kategorien links, Artikel rechts)
- ✅ **Top 10 Artikel** (kompakt, horizontaler Scroll)
- ✅ **Admin: User sperren UND löschen**
- ✅ **PDF-Einbettung** als iFrame + Neuer Tab Option
- ✅ **Autor unter Artikeln** anzeigen
- ✅ **Ansprechpartner-Feld** im Editor

## API Endpoints

### Auth
- `POST /api/auth/session` - Session erstellen
- `GET /api/auth/me` - Aktueller Benutzer
- `POST /api/auth/logout` - Abmelden

### Users
- `GET /api/users` - Alle Benutzer
- `PUT /api/users/{id}/role` - Rolle ändern
- `PUT /api/users/{id}/block` - User sperren/entsperren
- `DELETE /api/users/{id}` - User löschen (Admin only)

### Articles
- `GET /api/articles` - Alle Artikel
- `GET /api/articles/top-viewed` - Top N nach Views
- `GET /api/articles/by-category/{id}` - Nach Kategorie
- `POST /api/articles` - Erstellen
- `GET /api/articles/{id}` - Einzelner Artikel
- `PUT /api/articles/{id}` - Aktualisieren
- `DELETE /api/articles/{id}` - Löschen
- `POST /api/articles/{id}/favorite` - Favorit togglen
- `POST /api/articles/{id}/viewed` - Als angesehen markieren
- `POST /api/articles/generate-summary` - KI-Zusammenfassung

### Documents
- `POST /api/documents/upload` - PDF hochladen
- `GET /api/documents` - Alle Dokumente
- `GET /api/documents/{id}` - Dokumentdetails
- `GET /api/documents/{id}/pdf` - PDF-Datei streamen
- `DELETE /api/documents/{id}` - Löschen (Admin only)

### Categories
- `GET /api/categories` - Alle Kategorien
- `POST /api/categories` - Erstellen

### Search
- `POST /api/search` - Semantische + Keyword Suche

### Stats
- `GET /api/stats` - Dashboard-Statistiken

## Test Coverage
- Backend: 100% (13/13 Tests)
- Frontend: 100%
- Last tested: 20.02.2026

## Backlog

### P1 (High)
- [ ] Bild-Extraktion aus PDFs
- [ ] OCR für gescannte PDFs

### P2 (Medium)
- [ ] Artikel-Versionierung
- [ ] Export zu Word/PDF
- [ ] WebSocket für Echtzeit-Präsenz

### P3 (Nice to Have)
- [ ] Mehrsprachige UI
- [ ] Analytics Dashboard
- [ ] Schnellsuche (Strg+K)
