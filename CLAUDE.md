# Fußball-Trainingsplaner (Arbeitstitel)

Web-App, mit der Trainer Übungen auf einem Spielfeld zeichnen, als Szenenfolge animieren und als Bild oder Video exportieren.

## Sprache
- Benutzeroberfläche: Deutsch
- Code, Bezeichner und Commits: Englisch
- Antworten an mich: Deutsch, einfach erklärt (ich bin kein Profi-Entwickler)

## Technik
- React + TypeScript + Vite
- Zeichenfläche: Konva über react-konva
- Zustand: Zustand (Store), Undo/Redo über Verlaufsstapel
- Styling: Tailwind CSS
- Tests: Vitest für die Logik (Interpolation, Speichern/Laden)
- Kein Backend in Version 1: Speichern lokal (JSON-Datei + localStorage)

## Datenmodell (Kern)
- `Drill`: Titel, Beschreibung, Feldtyp, Liste von `Scene`
- `Scene`: Dauer in ms, Liste von `Item`-Zuständen, Liste von `Line`
- `Item`: id, Typ (player | ball | cone | goal | pole | text), x, y, Drehung, Farbe, Beschriftung
- `Line`: Typ (pass | run | dribble | shot), Punkte (gerade oder Bézier-Kurve), Farbe
- Koordinaten immer in Metern relativ zum Feld, nie in Pixeln. Umrechnung nur beim Zeichnen.
- Ein Item behält seine id über alle Szenen; die Animation interpoliert Position und Drehung zwischen aufeinanderfolgenden Szenen.

## Funktionsumfang nach Phasen
1. Spielfeld (Ganzfeld, Halbfeld, Strafraum, leere Fläche), responsiv
2. Objekte per Drag & Drop aus einer Seitenleiste
3. Linienwerkzeuge: Pass (durchgezogen), Laufweg (gestrichelt), Dribbling (Welle), Schuss (doppelt), auch als Kurven
4. Bearbeiten: auswählen, verschieben, drehen, kopieren, löschen, Undo/Redo, Speichern/Laden
5. Export: PNG und PDF
6. Animation: Zeitleiste mit Szenen, Play/Pause, Tempo, Ball folgt Passlinien
7. Videoexport: WebM (canvas.captureStream + MediaRecorder), danach MP4 (ffmpeg.wasm)
8. Später: Übungsbibliothek, Einheitenplaner, Cloud-Speicher mit Login

## Arbeitsregeln
- Immer nur die aktuell beauftragte Phase umsetzen, nichts vorwegnehmen.
- Vor größeren Änderungen kurz den Plan nennen und auf mein OK warten.
- Nach jeder Phase: `npm run build` und Tests ausführen, dann sagen, wie ich es im Browser prüfe.
- Nach jeder fertigen Phase einen Git-Commit erstellen.
- Bedienung muss mit Maus und Touch (Tablet) funktionieren.
- Alle Grafiken (Spieler, Ball, Hütchen, Tore) selbst als SVG/Konva-Formen erzeugen. Keine Grafiken, Figuren oder Layouts fremder Produkte übernehmen.

## Befehle
- `npm run dev` startet die App lokal
- `npm run build` prüft, ob alles kompiliert
- `npm test` führt die Tests aus
