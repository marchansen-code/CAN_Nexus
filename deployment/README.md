# CANUSA Nexus - Docker Deployment Guide

Diese Anleitung beschreibt, wie Sie CANUSA Nexus auf einer Docker-Umgebung hosten können.

## Voraussetzungen

- Docker 20.10+
- Docker Compose 2.0+
- Mindestens 2GB RAM
- 10GB freier Speicherplatz

## Schnellstart

```bash
# Repository klonen
git clone <repository-url>
cd canusa-nexus

# Umgebungsvariablen konfigurieren
cp deployment/.env.example deployment/.env
# Editieren Sie deployment/.env mit Ihren Einstellungen

# Container starten
cd deployment
docker-compose up -d

# Logs überprüfen
docker-compose logs -f
```

Die Anwendung ist dann erreichbar unter:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8001/api
- **API Docs**: http://localhost:8001/docs

## Projektstruktur

```
canusa-nexus/
├── backend/
│   ├── server.py          # FastAPI Backend
│   ├── requirements.txt   # Python Abhängigkeiten
│   └── .env               # Backend Umgebungsvariablen
├── frontend/
│   ├── src/               # React Source Code
│   ├── package.json       # Node.js Abhängigkeiten
│   └── .env               # Frontend Umgebungsvariablen
└── deployment/
    ├── docker-compose.yml # Docker Compose Konfiguration
    ├── Dockerfile.backend # Backend Docker Image
    ├── Dockerfile.frontend# Frontend Docker Image
    ├── nginx.conf         # Nginx Konfiguration
    └── .env.example       # Beispiel Umgebungsvariablen
```

## Konfiguration

### Umgebungsvariablen

Erstellen Sie eine `.env` Datei basierend auf `.env.example`:

```bash
# MongoDB
MONGO_URL=mongodb://mongodb:27017
DB_NAME=canusa_nexus

# Backend
BACKEND_PORT=8001

# Frontend
FRONTEND_PORT=3000
REACT_APP_BACKEND_URL=http://localhost:8001

# Admin Benutzer (wird beim ersten Start erstellt)
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD=IhrSicheresPasswort123!
DEFAULT_ADMIN_NAME=Administrator
```

### Wichtige Hinweise

1. **Passwort ändern**: Ändern Sie unbedingt das Standard-Admin-Passwort nach dem ersten Login!
2. **MONGO_URL**: In Docker-Compose verwenden Sie den Service-Namen `mongodb` als Host
3. **REACT_APP_BACKEND_URL**: Passen Sie dies an Ihre Domain an (z.B. `https://nexus.example.com`)

## Docker Compose Services

| Service   | Port  | Beschreibung                |
|-----------|-------|------------------------------|
| frontend  | 3000  | React Frontend               |
| backend   | 8001  | FastAPI Backend              |
| mongodb   | 27017 | MongoDB Datenbank            |
| nginx     | 80/443| Reverse Proxy (optional)     |

## Produktions-Setup

Für eine Produktionsumgebung empfehlen wir:

### 1. HTTPS aktivieren

Fügen Sie SSL-Zertifikate hinzu und konfigurieren Sie Nginx:

```nginx
server {
    listen 443 ssl;
    server_name nexus.example.com;
    
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    
    location / {
        proxy_pass http://frontend:3000;
    }
    
    location /api {
        proxy_pass http://backend:8001;
    }
}
```

### 2. MongoDB sichern

```yaml
# docker-compose.yml
mongodb:
  environment:
    MONGO_INITDB_ROOT_USERNAME: admin
    MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
```

### 3. Backup einrichten

```bash
# Backup Script
docker exec mongodb mongodump --out /backup/$(date +%Y%m%d)

# Cron Job (täglich um 3:00)
0 3 * * * /path/to/backup-script.sh
```

## Befehle

```bash
# Alle Container starten
docker-compose up -d

# Logs anzeigen
docker-compose logs -f [service]

# Container stoppen
docker-compose down

# Mit Volumes löschen (Vorsicht: löscht Daten!)
docker-compose down -v

# Container neu bauen
docker-compose build --no-cache

# In Container einloggen
docker exec -it canusa-backend bash
docker exec -it canusa-frontend sh
```

## Fehlerbehebung

### Backend startet nicht
```bash
# Logs prüfen
docker-compose logs backend

# Häufige Ursachen:
# - MongoDB nicht erreichbar
# - Fehlende Umgebungsvariablen
```

### Frontend zeigt "Cannot connect to API"
```bash
# REACT_APP_BACKEND_URL prüfen
# CORS-Einstellungen im Backend prüfen
```

### MongoDB Verbindungsfehler
```bash
# MongoDB Status prüfen
docker exec mongodb mongosh --eval "db.adminCommand('ping')"
```

## Updates

```bash
# Neueste Version holen
git pull

# Container neu bauen und starten
docker-compose build
docker-compose up -d
```

## Support

Bei Fragen oder Problemen wenden Sie sich an das IT-Team.
