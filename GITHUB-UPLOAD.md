# Quellcode nach GitHub hochladen

Dieses Repository enthaelt den fuer eigenstaendiges Cloudflare-Hosting
angepassten Quellcode. Fuer einen erneuten Browser-Upload nur die geaenderten
Dateien verwenden, nicht `node_modules` oder Build-Ausgaben. Der urspruengliche
Entwicklungsordner und die laufende Sites-Website bleiben unveraendert.

## Upload im Browser

1. Falls du das ZIP verwendest, entpacke es zuerst. GitHub entpackt ein
   hochgeladenes ZIP nicht automatisch zu Repository-Dateien.
2. Oeffne den Ordner `drop-radar-github` im Finder. Mit `Cmd + Shift + .`
   werden die versteckten Dateien sichtbar.
3. Oeffne im gewuenschten GitHub-Repository `Add file` und `Upload files`.
4. Ziehe den INHALT dieses Ordners in die Upload-Flaeche. Behalte die
   Unterordner bei. `package.json` und `README.md` sollen direkt im
   Repository-Hauptverzeichnis liegen, nicht in einem zusaetzlichen Unterordner.
5. Pruefe, dass `.gitignore`, `.npmrc`, `.env.example` und `wrangler.json`
   mit dabei sind. `wrangler.json` enthaelt keine geheimen Zugangsschluessel.
   Die Cloudflare-Version braucht keine `.openai/hosting.json`.
6. Committe den Upload. Bei einem bereits befuellten Repository verwende
   einen neuen Branch und pruefe die Unterschiede vor dem Zusammenfuehren.

GitHub begrenzt den Browser-Upload auf 100 Dateien pro Vorgang, nicht das
gesamte Repository. Pro Datei gilt dabei eine Grenze von 25 MiB.
Quelle: https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository

## Was enthalten ist

- App, API-Routen, Kartenansicht und alle tatsaechlich importierten UI-Komponenten.
- Datenbank-Schema, alle Migrationen und deren Metadaten.
- Tests, Build-Helfer, Cloudflare-Konfiguration, Dokumentation und PWA-Dateien.
- `package.json` und die unveraenderte `package-lock.json` fuer die Installation.

Nicht enthalten sind `node_modules`, Build-Ausgaben, lokale Datenbanken,
Git-Verlauf, lokale Laufzeitdaten und `.dev.vars` mit privaten Push-Schluesseln.
Ausgelassen wurden ausserdem ungenutzte UI-Vorlagen, ein ungenutzter Hook,
drei ungenutzte Vorlagen-Icons und die separate D1-Beispiel-App.
Die Dateien unter `build/` sind benoetigter Build-QUELLCODE und bleiben enthalten.

Die `.gitignore` schuetzt kuenftige Git-Commits. Beim manuellen Browser-Upload
filtert sie ausgewaehlte Dateien nicht fuer dich; lade nur diesen Export hoch.

## Weiterentwicklung

Verwende Node 24 fuer die Tests. Installiere im Projektordner die Abhaengigkeiten:

```sh
npm ci
node --test tests/*.test.mjs
npx tsc --noEmit
npm run build
```

Fuer lokale Entwicklung: `node scripts/push-keys.mjs`, dann `npm run dev`.
Das Schluessel-Skript erzeugt lokale Testschluessel, falls noch keine `.dev.vars`
vorhanden ist. Produktionsschluessel der bestehenden App nicht ersetzen.
Das lokale Datenbank-Setup und weitere Details stehen in `README.md`.

Ein Quellcode-Upload uebertraegt weder die vorhandene Produktionsdatenbank
noch Push-Abonnements oder Produktions-Zugangsdaten. Er veroeffentlicht die
Website auch nicht automatisch und aendert nicht ihren derzeitigen Funktionsstand.
