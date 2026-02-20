# Smart Knowledge Nexus - PRD

## Original Problem Statement
KI-gestützte Wissensmanagement-Plattform nach dem Vorbild von Serviceware Knowledge/SABIO, spezialisiert auf automatisierten Content-Import und intelligente Abfrage.

## User Personas
1. **Knowledge Manager** - Verwaltet die Wissensbasis, erstellt Kategorien, überwacht Workflow
2. **Content Editor** - Erstellt und bearbeitet Wissensartikel, importiert PDFs
3. **Support Agent** - Nutzt KI-Suche für schnelle Antworten
4. **Administrator** - Verwaltet Benutzer und Zugriffsrechte

## Core Requirements (Static)
- [ ] PDF-Import mit KI-Zusammenfassung
- [ ] Semantische Suche mit RAG
- [ ] Hierarchische Kategoriestruktur
- [ ] Workflow-Management (Draft/Review/Published)
- [ ] Multichannel Widget-API
- [ ] Benutzerverwaltung mit Rollen

## Technology Stack
- **Frontend**: React 18, TailwindCSS, Shadcn/UI, TipTap Rich Editor
- **Backend**: FastAPI, Python 3.11
- **Database**: MongoDB (Dokumente), Pinecone (Vektoren)
- **AI**: Gemini 3 Flash (Emergent LLM Key)
- **Auth**: Emergent-managed Google OAuth

## What's Been Implemented

### Phase 1 - MVP (20.02.2026)
- ✅ Landing Page mit Google Auth Login
- ✅ Dashboard mit Statistiken und Bento-Grid
- ✅ KI-Suche mit semantischer RAG-Abfrage
- ✅ Artikel-CRUD mit Status-Workflow
- ✅ PDF-Upload und automatische Verarbeitung
- ✅ Kategorieverwaltung (Baumstruktur)
- ✅ Widget-API für externe Integration
- ✅ Responsive Design

### Phase 2 - Enhanced Features (20.02.2026)
- ✅ Rich-Text-Editor mit TipTap
  - Formatierungen (Bold, Italic, Underline, Strikethrough, Highlight)
  - Überschriften (H1, H2, H3)
  - Textausrichtung
  - Listen (Aufzählung, Nummeriert)
  - Links und Bilder einfügen
  - Tabellen-Unterstützung
- ✅ PDF-Import direkt im Editor
- ✅ Copy & Paste mit HTML-Erhaltung
- ✅ Erweiterte PDF-Extraktion (Tabellen, Struktur)
- ✅ Benutzerverwaltung
  - Rollenverwaltung (Admin, Editor, Viewer)
  - Berechtigungssystem

## Prioritized Backlog

### P0 (Critical)
- [x] Core CRUD Operations
- [x] Authentication
- [x] PDF Processing
- [x] Search/RAG

### P1 (High)
- [x] Rich Text Editor
- [x] User Management
- [ ] Bild-Extraktion aus PDFs (Base64 oder Upload)
- [ ] OCR für gescannte PDFs

### P2 (Medium)
- [ ] Versionierung von Artikeln
- [ ] Kommentar-System für Reviews
- [ ] E-Mail-Benachrichtigungen bei Wiedervorlage
- [ ] Export zu Word/PDF
- [ ] Bulk-Import mehrerer PDFs

### P3 (Nice to Have)
- [ ] Dark Mode
- [ ] Mehrsprachige UI
- [ ] Analytics Dashboard
- [ ] AI-gestützte Schreibvorschläge
- [ ] Integration mit externen CRM-Systemen

## API Endpoints

### Auth
- `POST /api/auth/session` - Session erstellen
- `GET /api/auth/me` - Aktueller Benutzer
- `POST /api/auth/logout` - Abmelden

### Users
- `GET /api/users` - Alle Benutzer
- `GET /api/users/{id}` - Einzelner Benutzer
- `PUT /api/users/{id}/role` - Rolle ändern (Admin only)

### Articles
- `GET /api/articles` - Alle Artikel
- `GET /api/articles/{id}` - Einzelner Artikel
- `POST /api/articles` - Artikel erstellen
- `PUT /api/articles/{id}` - Artikel aktualisieren
- `DELETE /api/articles/{id}` - Artikel löschen

### Categories
- `GET /api/categories` - Alle Kategorien
- `POST /api/categories` - Kategorie erstellen
- `PUT /api/categories/{id}` - Kategorie aktualisieren
- `DELETE /api/categories/{id}` - Kategorie löschen

### Documents
- `POST /api/documents/upload` - PDF hochladen
- `GET /api/documents` - Alle Dokumente
- `GET /api/documents/{id}` - Dokument-Details
- `POST /api/documents/{id}/create-article` - Artikel aus Dokument erstellen

### Search
- `POST /api/search` - Semantische Suche mit KI-Antwort

### Widget (Public)
- `GET /api/widget/search` - Öffentliche Widget-Suche
- `GET /api/widget/article/{id}` - Öffentlicher Artikel-Abruf

## Next Tasks
1. Bild-Extraktion aus PDFs implementieren
2. OCR-Integration für gescannte Dokumente
3. Artikel-Versionierung hinzufügen
