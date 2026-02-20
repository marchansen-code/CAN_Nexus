# CANUSA Nexus - The Knowledge Hub - PRD

## Original Problem Statement
KI-gestützte Wissensmanagement-Plattform für CANUSA Touristik GmbH & Co. KG und CU-Travel, spezialisiert auf automatisierten Content-Import und intelligente Abfrage.

## User Personas
1. **Knowledge Manager** - Verwaltet die Wissensbasis, erstellt Kategorien, überwacht Workflow
2. **Content Editor** - Erstellt und bearbeitet Wissensartikel, importiert PDFs
3. **Support Agent** - Nutzt KI-Suche für schnelle Antworten
4. **Administrator** - Verwaltet Benutzer und Zugriffsrechte

## Core Requirements (Static)
- [x] PDF-Import mit KI-Zusammenfassung, Tabellen und Struktur
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

### Phase 1 - MVP (20.02.2026)
- ✅ Landing Page mit Google Auth Login
- ✅ Dashboard mit Statistiken
- ✅ KI-Suche mit semantischer RAG-Abfrage
- ✅ Artikel-CRUD mit Status-Workflow
- ✅ PDF-Upload und automatische Verarbeitung
- ✅ Kategorieverwaltung (Baumstruktur)
- ✅ Widget-API für externe Integration

### Phase 2 - Enhanced Features (20.02.2026)
- ✅ Rich-Text-Editor mit TipTap
- ✅ PDF-Import direkt im Editor (mit Tabellen/Struktur)
- ✅ Copy & Paste mit HTML-Erhaltung
- ✅ Benutzerverwaltung mit Rollensystem

### Phase 3 - CANUSA Customization (20.02.2026)
- ✅ Domain-Beschränkung auf @canusa.de und @cu-travel.com
- ✅ CANUSA-Farbschema (Rot) und Branding
- ✅ Startseite nur für Mitarbeiter mit Social Media Links
- ✅ Simultaneousbearbeitung mit Präsenzanzeige
- ✅ Hierarchische Kategorien im Editor mit Hinzufügen-Option
- ✅ Sichtbarkeitsberechtigungen (Alle/Editoren/Admins)
- ✅ Favoriten-System
- ✅ Dashboard: Favoriten und zuletzt angesehene Artikel
- ✅ Benutzerstatistik (eigene Artikel/Dokumente)

### Phase 4 - UI/UX Refinements (20.02.2026)
- ✅ Rollenbasierte Sidebar-Navigation
- ✅ Separate Read-Only Artikelansicht
- ✅ Edit-Button nur für Editor/Admin sichtbar
- ✅ Neue Benutzer bekommen automatisch "Viewer" Rolle
- ✅ Automatische Zusammenfassungserstellung via KI

### Phase 5 - CANUSA Nexus Rebranding (20.02.2026)
- ✅ Umbenennung zu "CANUSA Nexus - The Knowledge Hub"
- ✅ Vollwertiger WYSIWYG-Editor mit:
  - Textfarben (10 Farben inkl. CANUSA Rot)
  - Hervorhebungen (5 Farben)
  - YouTube-Video-Einbettung
  - Erweiterte Tabellenfunktionen
  - Hoch-/Tiefstellung
  - Horizontale Linien
  - Code-Blöcke und Zitate
- ✅ Full-Width Artikelansicht (nicht boxed)
- ✅ Top 10 Artikel-Sidebar (systemweit, nach Views sortiert)
- ✅ Kategorien-Baum mit Unterartikeln in Sidebar
- ✅ View-Count-Tracking für Artikel
- ✅ PDF-Import mit Vorschau-Dialog
- ✅ Separate Zusammenfassungs-Übernahme aus PDFs

## Prioritized Backlog

### P0 (Critical) - Completed
- [x] Core CRUD Operations
- [x] Authentication with domain restriction
- [x] PDF Processing with tables
- [x] Search/RAG
- [x] Favorites and Recently Viewed
- [x] Role-based sidebar navigation
- [x] Read-only article view with edit permissions
- [x] Full WYSIWYG Editor
- [x] Top 10 Articles and Category Browser

### P1 (High) - PDF Import Enhancement
- [ ] Bild-Extraktion aus PDFs (Base64 Upload)
- [ ] OCR für gescannte PDFs
- [ ] Perfekte Tabellen-Erhaltung mit Styling

### P2 (Medium)
- [ ] Versionierung von Artikeln
- [ ] Kommentar-System für Reviews
- [ ] Export zu Word/PDF
- [ ] WebSocket für Echtzeit-Präsenz (statt Polling)

### P3 (Nice to Have)
- [ ] Dark Mode
- [ ] Mehrsprachige UI
- [ ] Analytics Dashboard
- [ ] AI-gestützte Schreibvorschläge

## API Endpoints

### Auth
- `POST /api/auth/session` - Session erstellen (Domain-geprüft)
- `GET /api/auth/me` - Aktueller Benutzer
- `POST /api/auth/logout` - Abmelden

### Users
- `GET /api/users` - Alle Benutzer
- `PUT /api/users/{id}/role` - Rolle ändern (Admin only)

### Articles
- `GET /api/articles` - Alle Artikel
- `GET /api/articles/top-viewed?limit=N` - Top N Artikel nach Views
- `GET /api/articles/by-category/{id}` - Artikel nach Kategorie
- `POST /api/articles` - Artikel erstellen
- `GET /api/articles/{id}` - Einzelner Artikel
- `PUT /api/articles/{id}` - Artikel aktualisieren
- `DELETE /api/articles/{id}` - Artikel löschen
- `POST /api/articles/{id}/favorite` - Favorit togglen
- `POST /api/articles/{id}/viewed` - Als angesehen markieren (inkrementiert view_count)
- `POST /api/articles/{id}/presence` - Präsenz aktualisieren
- `POST /api/articles/generate-summary` - KI-Zusammenfassung erstellen

### Categories
- `GET /api/categories` - Alle Kategorien (hierarchisch)
- `POST /api/categories` - Kategorie erstellen

### Documents
- `POST /api/documents/upload` - PDF hochladen
- `GET /api/documents` - Alle Dokumente
- `GET /api/documents/{id}` - Dokumentdetails

### Search
- `POST /api/search` - Semantische Suche mit KI-Antwort

### Stats
- `GET /api/stats` - Dashboard-Statistiken

## Admin Users
- Marc Hansen (marc.hansen@canusa.de) - Administrator

## Test Coverage
- Backend: 100% (10/10 Tests in Iteration 4)
- Frontend: 100% (alle UI-Tests bestanden)
- Last tested: 20.02.2026

## Key UI Components
- **Landing Page**: CANUSA Nexus branding mit Company-Info
- **Dashboard**: Statistiken, Favoriten, Zuletzt angesehen
- **Artikel-Liste**: Filter nach Status und Kategorie
- **Artikel-Ansicht**: Full-Width mit Top 10 und Kategorien-Sidebar
- **Artikel-Editor**: Vollwertiger WYSIWYG mit PDF-Import
- **KI-Suche**: RAG-basierte Suche mit Quellenangaben
