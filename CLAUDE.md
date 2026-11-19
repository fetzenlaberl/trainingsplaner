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
- Kein Backend in Version 1: Speichern lokal (JSON-Datei + localStorage für die aktuelle Übung, IndexedDB für Bibliothek und Einheiten)

## Datenmodell (Kern)
- `Drill`: Titel, Beschreibung, Kategorie (optional: Aufwärmen, Technik, Passspiel, Torschuss, Taktik, Spielform, Abschluss), Feldtyp, Feld-Darstellung (Farbe, Raster, Ausrichtung quer/hoch; hoch = Ansicht um -90° gedreht, Daten bleiben unverändert), Liste von `Scene`
- `Scene`: Dauer in ms, Liste von `Item`-Zuständen, Liste von `Line`, Liste von `Zone`
- `Zone` (Feldmarkierung): id, Form (rect | triangle | ellipse), Mittelpunkt x/y, Breite, Höhe (Meter), Drehung, Randfarbe, Füllfarbe, Deckkraft der Füllung, gestrichelt ja/nein, Beschriftung, eingebaute Minitore (0 | 4 | 6, je Hälfte an den kürzeren gegenüberliegenden Seiten = Kleinspielfeld), freie Ecken (null = Grundform; sonst Eckpunkte relativ zum Mittelpunkt vor der Drehung, z. B. Raute/Trapez); behält die id über Szenen und wird interpoliert
- `Item`: id, Typ (player | ball | cone | goal | minigoal | pole | slalom | dummy | wall | ladder | text | textbox), x, y, Drehung, Größe (Faktor, 1 = Standard; Spieler starten mit 1,5), Form (nur Spieler: Kreis | Dreieck | Kreuz), Farbe (beim Textfeld: Hintergrund), Beschriftung (Nummer bzw. Text), Name (Namensschild unter dem Spieler), Hervorheben (Leuchtrahmen)
- `Line`: Typ (pass | run | dribble | shot), Wegpunkte (Start, beliebig viele Biegungen, Ende), rund oder eckig, Farbe. Dateiformat aktuell Version 5 (seit Version 2 Wegpunkte, seit Version 3 Zonen, seit Version 4 Textfelder, Namensschilder, Hervorheben, Zonen-Füllung, seit Version 5 Trainingsmaterial und Kleinspielfelder, seit Version 6 freie Zonen-Ecken); Version-1-Linien (Start, Ende, ein Kontrollpunkt) werden beim Laden umgewandelt.
- Koordinaten immer in Metern relativ zum Feld, nie in Pixeln. Umrechnung nur beim Zeichnen.
- Ein Item behält seine id über alle Szenen; die Animation interpoliert Position und Drehung zwischen aufeinanderfolgenden Szenen.
- `TrainingSession` (Einheit): Titel, Datum, Beginn, Mannschaft, Ziel, Notizen, Liste von Blöcken
- Block: verweist per id auf eine Übung der Bibliothek (keine Kopie) oder ist ein freier Block (z. B. Trinkpause); Dauer in Minuten, Notiz

## Funktionsumfang nach Phasen
1. Spielfeld (Ganzfeld, Halbfeld, Strafraum, leere Fläche), responsiv
2. Objekte per Drag & Drop aus einer Seitenleiste
3. Linienwerkzeuge: Pass (durchgezogen), Laufweg (gestrichelt), Dribbling (Welle), Schuss (doppelt), auch als Kurven
4. Bearbeiten: auswählen, verschieben, drehen, kopieren, löschen, Undo/Redo, Speichern/Laden
5. Export: PNG und PDF
6. Animation: Zeitleiste mit Szenen, Play/Pause, Tempo, Ball folgt Passlinien
7. Videoexport: WebM (canvas.captureStream + MediaRecorder), danach MP4 (ffmpeg.wasm)
8. Erweiterungen, in Teilschritten:
   - 8a Übungsbibliothek (IndexedDB, Suche, Kategorien, Sicherung als Datei) – erledigt
   - 8b Einheitenplaner (Blöcke aus der Bibliothek, Zeiten, PDF der Einheit) – erledigt
   - 8c Cloud-Speicher mit Login – zurückgestellt. Braucht einen externen Anbieter (z. B. Supabase mit EU-Servern), ein vom Nutzer angelegtes Projekt und Klärung von Datenschutz (DSGVO) und Kosten. Beginnt Version 2 (mit Backend); vorher eigenen Plan vorlegen.

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
