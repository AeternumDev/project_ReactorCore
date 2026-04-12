# ReactorCore — Tschernobyl-Reaktor-Simulation

Eine browserbasierte Tschernobyl-Reaktor-Simulation als Single Page Application. Steuere einen RBMK-1000-Reaktor und erlebe die Physik hinter dem Unfall von 1986.

## Tech-Stack

| Technologie | Verwendung |
|---|---|
| Next.js 14 | Framework (App Router) |
| React | UI-Bibliothek |
| TypeScript | Typsicherheit |
| Tailwind CSS | Styling |
| Clerk | Authentifizierung |
| PostgreSQL | Datenbank (Railway) |
| Recharts | Diagramme & Visualisierung |
| Lucide React | Icons |
| Jest + Testing Library | Unit-Tests |

## Setup

```bash
# Repository klonen
git clone <REPO_URL>
cd project_ReactorCore

# Dependencies installieren
npm install

# Umgebungsvariablen konfigurieren
cp .env.example .env.local
# .env.local mit echten Werten befüllen (Clerk Keys, DATABASE_URL)

# Entwicklungsserver starten
npm run dev
```

Die App ist dann unter [http://localhost:3000](http://localhost:3000) erreichbar.

## Scripts

| Befehl | Beschreibung |
|---|---|
| `npm run dev` | Entwicklungsserver starten |
| `npm run build` | Produktions-Build |
| `npm run start` | Produktionsserver starten |
| `npm run lint` | ESLint ausführen |
| `npm test` | Tests ausführen |
| `npm run test:watch` | Tests im Watch-Modus |
| `npm run test:coverage` | Tests mit Coverage-Report |

## Projektstruktur

```
src/
├── app/           # Next.js App Router (Pages, Layouts, API Routes)
├── components/    # React-Komponenten (Cockpit, UI)
├── lib/
│   ├── physics/   # Reaktor-Physik-Engine
│   ├── game/      # Game-State (Reducer, Actions, Scoring)
│   └── db.ts      # Datenbank-Verbindung
└── __tests__/     # Unit-Tests
```

