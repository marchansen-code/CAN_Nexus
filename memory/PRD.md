# CANUSA Nexus - The Knowledge Hub - PRD

## Original Problem Statement
KI-gestützte Wissensmanagement-Plattform für CANUSA Touristik GmbH & Co. KG und CU-Travel, spezialisiert auf automatisierten Content-Import und intelligente Abfrage.

## User Personas
1. **Knowledge Manager** - Verwaltet die Wissensbasis, erstellt Kategorien, überwacht Workflow
2. **Content Editor** - Erstellt und bearbeitet Wissensartikel, importiert PDFs
3. **Support Agent** - Nutzt KI-Suche für schnelle Antworten
4. **Administrator** - Verwaltet Benutzer und Zugriffsrechte

## Core Requirements (Static)
- [x] PDF-Import mit Struktur-Erhaltung
- [x] Semantische Suche mit RAG
- [x] Hierarchische Kategoriestruktur
- [x] Workflow-Management (Draft/Review/Published)
- [x] Multichannel Widget-API
- [x] Benutzerverwaltung mit Rollen
- [x] Domain-Beschränkung (@canusa.de, @cu-travel.com)
- [x] CANUSA-Branding und Farbschema

## Technology Stack
- **Frontend**: React 18, TailwindCSS, Shadcn/UI, TipTap Rich Editor
- **Backend**: FastAPI, Python 3.11
- **Database**: MongoDB (Dokumente), Pinecone (Vektoren)
- **AI**: Gemini 3 Flash (Emergent LLM Key)
- **Auth**: Emergent-managed Google OAuth (Domain-restricted)

## What's Been Implemented

### Phase 1-4 - Core Features (Completed)
- ✅ Landing Page mit Google Auth Login
- ✅ Dashboard mit Statistiken
- ✅ KI-Suche mit semantischer RAG-Abfrage
- ✅ Artikel-CRUD mit Status-Workflow
- ✅ PDF-Upload und automatische Verarbeitung
- ✅ Kategorieverwaltung (Baumstruktur)
- ✅ Widget-API für externe Integration
- ✅ Rich-Text-Editor mit TipTap
- ✅ Rollenbasierte Sidebar-Navigation
- ✅ Vollwertiger WYSIWYG-Editor

### Phase 5 - CANUSA Nexus Rebranding (Completed)
- ✅ Umbenennung zu "CANUSA Nexus - The Knowledge Hub"
- ✅ Full-Width Artikelansicht
- ✅ Top 10 Artikel-Sidebar (systemweit)
- ✅ View-Count-Tracking für Artikel

### Phase 6 - Advanced Features (20.02.2026)
- ✅ **Dark/Light/Auto Theme-Mode**
  - Theme-Toggle im Header (Sonne/Mond/Monitor-Symbol + "Mode")
  - System-Präferenz-Erkennung für "Auto"
  - Persistenz via LocalStorage
- ✅ **Admin: Dokumente löschen**
  - DELETE-Endpoint `/api/documents/{id}`
  - Trash-Icon nur für Admins sichtbar
- ✅ **Wissensartikel Split-Layout**
  - Links: Kategorien-Baum (klickbar mit Unterordnern)
  - Rechts: Artikelliste mit Suche
  - Oben: Top 10 meistgesehene Artikel
- ✅ **Dashboard: Beliebteste Artikel**
  - Neue Sektion unter "Neueste Artikel"
  - Rangliste mit Aufrufe-Anzahl
- ✅ **Admin: User sperren**
  - PUT-Endpoint `/api/users/{id}/block`
  - Gesperrte User erhalten 403-Fehler
  - Sperrung-Badge in Benutzerliste
- ✅ **Verbesserte KI-Suche**
  - Keyword + Semantische Suche kombiniert
  - Höhere Scores für Titel-Treffer
- ✅ **PDF-Import ohne automatische Zusammenfassung**
  - Nur Content-Extraktion
  - HTML-Layout-Erhaltung
  - PDF-Einbettung als Fallback verfügbar
- ✅ **Autor unter Artikel anzeigen**
  - "Verfasst von" Sektion mit Avatar, Name, E-Mail
- ✅ **Ansprechpartner-Feld im Editor**
  - Dropdown mit User-Liste in Sidebar
  - Anzeige in Artikelansicht

## Prioritized Backlog

### P0 (Critical) - Completed
- [x] All core features
- [x] Theme-Mode Toggle
- [x] User blocking
- [x] Document deletion
- [x] Split-Layout Articles

### P1 (High)
- [ ] Bild-Extraktion aus PDFs (Base64)
- [ ] OCR für gescannte PDFs
- [ ] Perfekte Tabellen-Erhaltung mit Styling

### P2 (Medium)
- [ ] Versionierung von Artikeln
- [ ] Kommentar-System für Reviews
- [ ] Export zu Word/PDF
- [ ] WebSocket für Echtzeit-Präsenz (statt Polling)

### P3 (Nice to Have)
- [ ] Mehrsprachige UI
- [ ] Analytics Dashboard
- [ ] AI-gestützte Schreibvorschläge

## API Endpoints

### Auth
- `POST /api/auth/session` - Session erstellen
- `GET /api/auth/me` - Aktueller Benutzer
- `POST /api/auth/logout` - Abmelden

### Users
- `GET /api/users` - Alle Benutzer
- `PUT /api/users/{id}/role` - Rolle ändern
- `PUT /api/users/{id}/block` - User sperren/entsperren

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
- `GET /api/stats` - Dashboard-Statistiken (inkl. top_articles)

## Admin Users
- Marc Hansen (marc.hansen@canusa.de) - Administrator

## Test Coverage
- Backend: 100% (59 Tests)
- Frontend: 100% (alle UI-Tests bestanden)
- Last tested: 20.02.2026

## Key UI Features
- **Theme Toggle**: Light/Dark/Auto mit Tastenkürzel
- **Split-Layout**: Kategorien links, Artikel rechts
- **Top 10 Banner**: Meistgesehene Artikel
- **User Blocking**: Sperrung mit sofortiger Session-Ungültigkeit
- **Ansprechpartner**: Pro Artikel zuweisbar
