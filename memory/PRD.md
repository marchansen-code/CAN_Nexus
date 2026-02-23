# CANUSA Nexus - The Knowledge Hub - PRD

## Original Problem Statement
KI-gestützte Wissensmanagement-Plattform für CANUSA Touristik GmbH & Co. KG und CU-Travel.

## Technology Stack
- **Frontend**: React 18, TailwindCSS, Shadcn/UI, TipTap Rich Editor
- **Backend**: FastAPI, Python 3.11, bcrypt (Passwort-Hashing)
- **Database**: MongoDB
- **Auth**: E-Mail/Passwort mit Session-Cookies

## Implemented Features

### Core Features
- ✅ E-Mail/Passwort Login (ersetzt Google Auth)
- ✅ Dashboard mit Statistiken, Favoriten, Beliebteste Artikel
- ✅ Keyword-basierte Suche mit Live-Vorschau (ersetzt KI-Suche)
- ✅ Artikel-CRUD mit Status-Workflow
- ✅ Kategorieverwaltung (Baumstruktur)
- ✅ Dark/Light/Auto Theme-Mode

### Admin Features
- ✅ Benutzer anlegen mit E-Mail/Passwort
- ✅ Benutzer-Passwörter ändern
- ✅ User sperren und löschen
- ✅ Dokumente löschen
- ✅ Rollenverwaltung (Admin/Editor/Viewer)

### PDF Features
- ✅ PDF-Upload mit Duplikat-Prüfung
- ✅ PDF-Einbettung als iFrame
- ✅ PDF in neuem Tab öffnen
- ✅ Text-Extraktion mit Layout-Erhaltung

### Iteration 9 (23.02.2026 - abgeschlossen)
**Große Änderungen:**

1. **Google Auth → E-Mail/Passwort Login**
   - Klassisches Login mit E-Mail und Passwort
   - bcrypt-verschlüsselte Passwörter
   - "Angemeldet bleiben" Option (7 oder 30 Tage)
   - Stylische Login-Seite mit CANUSA-Branding
   - Admins können Benutzer anlegen und Passwörter vergeben
   - Domain-Beschränkung entfernt

2. **KI-Suche → Ajax-Keyword-Suche**
   - Pinecone/LLM komplett entfernt
   - Echtzeit-Suche beim Tippen (300ms Debounce)
   - MongoDB regex-basierte Suche
   - Ergebnisse mit Relevanz-Scoring und Highlighting
   - Schnellsuche für Autocomplete

3. **Docker Deployment Dokumentation**
   - `/app/deployment/README.md` - Schritt-für-Schritt Anleitung
   - `docker-compose.yml` - MongoDB, Backend, Frontend
   - `Dockerfile.backend` und `Dockerfile.frontend`
   - `nginx.conf` für Production
   - `.env.example` - Umgebungsvariablen Template

## API Endpoints

### Auth
- `POST /api/auth/login` - Login mit E-Mail/Passwort
- `GET /api/auth/me` - Aktuellen Benutzer abrufen
- `POST /api/auth/logout` - Logout

### Users (Admin only)
- `GET /api/users` - Alle Benutzer auflisten
- `POST /api/users` - Neuen Benutzer anlegen
- `PUT /api/users/{id}/role` - Rolle ändern
- `PUT /api/users/{id}/password` - Passwort ändern
- `PUT /api/users/{id}/block` - Sperren/Entsperren
- `DELETE /api/users/{id}` - Benutzer löschen

### Search
- `POST /api/search` - Volltext-Suche mit Scoring
- `GET /api/search/quick` - Schnellsuche für Autocomplete

### Articles
- Standard CRUD Endpoints

### Documents
- PDF Upload, Abruf, Embed, Löschen

### Images
- Bild-Upload für Editor

## Default Admin
- **E-Mail**: marc.hansen@canusa.de
- **Passwort**: CanusaNexus2024!
- **Rolle**: Administrator

⚠️ **Wichtig**: Passwort nach erstem Login ändern!

## Test Coverage
- Backend: 100% (28/28 Tests für Iteration 9)
- Frontend: 100%
- Last tested: 23.02.2026

## Deployment

### Docker (empfohlen)
```bash
cd deployment
cp .env.example .env
# .env anpassen
docker-compose up -d
```

Siehe `/app/deployment/README.md` für vollständige Anleitung.

## Backlog

### P1 (High)
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
- [ ] KI-Suche als optionales Feature (später wieder aktivierbar)
