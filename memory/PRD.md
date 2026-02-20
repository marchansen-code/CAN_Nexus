# CANUSA Knowledge Hub - PRD

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
- ✅ Marc Hansen als Administrator gesetzt

## Prioritized Backlog

### P0 (Critical) - Completed
- [x] Core CRUD Operations
- [x] Authentication with domain restriction
- [x] PDF Processing with tables
- [x] Search/RAG
- [x] Favorites and Recently Viewed

### P1 (High)
- [ ] Bild-Extraktion aus PDFs (Base64 Upload)
- [ ] OCR für gescannte PDFs
- [ ] E-Mail-Benachrichtigungen bei Wiedervorlage

### P2 (Medium)
- [ ] Versionierung von Artikeln
- [ ] Kommentar-System für Reviews
- [ ] Export zu Word/PDF
- [ ] Bulk-Import mehrerer PDFs

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
- `POST /api/articles` - Artikel erstellen
- `PUT /api/articles/{id}` - Artikel aktualisieren (inkl. visibility)
- `DELETE /api/articles/{id}` - Artikel löschen
- `POST /api/articles/{id}/favorite` - Favorit togglen
- `POST /api/articles/{id}/viewed` - Als angesehen markieren
- `POST /api/articles/{id}/presence` - Präsenz aktualisieren

### Categories
- `GET /api/categories` - Alle Kategorien (hierarchisch)
- `POST /api/categories` - Kategorie erstellen

### Documents
- `POST /api/documents/upload` - PDF hochladen
- `GET /api/documents` - Alle Dokumente

### Search
- `POST /api/search` - Semantische Suche mit KI-Antwort

### Favorites
- `GET /api/favorites` - Benutzer-Favoriten

## Admin Users
- Marc Hansen (marc.hansen@canusa.de) - Administrator
