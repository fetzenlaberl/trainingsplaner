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
- Installierbar und offline (PWA über vite-plugin-pwa): Service Worker merkt sich die App; der MP4-Umwandler wird erst bei Bedarf geladen und dann gecacht. Neue Versionen werden in der App angekündigt (kein automatisches Neuladen). Prüfen mit `npm run build` + `npm run preview` (im Dev-Modus ist der Service Worker aus).
- Kein Backend in Version 1: Speichern lokal (JSON-Datei + localStorage für die aktuelle Übung, IndexedDB für Bibliothek, Einheiten, Mannschaften und Tages-Intensitäten des Wochenplaners)

## Datenmodell (Kern)
- `Drill`: Titel, Beschreibung, Bereich (Trainingsform | Taktik/Aufstellung), Kategorie (optional: Aufwärmen, Technik, Passspiel, Torschuss, Taktik, Spielform, Abschluss), Angaben (Spieleranzahl, Dauer in Minuten, Feldgröße als Text, Altersklasse U7–U19/Erwachsene), Feldtyp (Teile des Großfelds oder eigene kleine Felder: Futsal 40 × 20 m ohne Bande, Halle mit Bande 40 × 20 m, Korridor 50 × 25 m mit Mittellinie und 2 Toren, Viertelfeld 52 × 34 m mit Toren an allen Seiten; Raster werden auf kleine Felder gestreckt, das eigene Raster bleibt in Metern), Feld-Darstellung (Farbe bzw. Rasen-Design oder eigener Farbverlauf aus zwei Farben, Mähmuster quer/längs/Karo in drei Breiten, Lichtverlauf in drei Stärken mit Lichtquelle Mitte/Seite/Ecke (wie auf dem Bildschirm) und Art Lichtfleck/dunkler Rand, Linien in 5 Stärken, Linienfarbe, abgerundete Außenlinien, Rückzugslinien 22 m (nur Großfeld), Notizen unter dem Feld (an/aus und Text; kommen in PNG/PDF mit), Raster inkl. Zonen A–F und eigenem Raster mit Spalten-/Zeilengrößen in Metern, eigene Zonen-Beschriftung (keine/Zahlen/Buchstaben, Ecke/Mitte/außen, drei Größen; gezählt zeilenweise von links oben wie auf dem Bildschirm, das 20-Zonen-Raster behält seine Nummerierung), Ausrichtung quer/hoch; hoch = Ansicht um -90° gedreht, Daten bleiben unverändert), Liste von `Scene`, importierte Bilder (id → Daten-URL, verkleinert auf max. 1600 px; beim Speichern nur noch benutzte), Hintergrundbild mit Deckkraft in der Feld-Darstellung
- `Scene`: Dauer in ms, Liste von `Item`-Zuständen, Liste von `Line`, Liste von `Zone`
- `Zone` (Feldmarkierung): id, Form (rect | triangle | ellipse), Mittelpunkt x/y, Breite, Höhe (Meter), Drehung, Randfarbe, Füllfarbe, Deckkraft der Füllung, gestrichelt ja/nein, Beschriftung, eingebaute Minitore (0 | 4 | 6, je Hälfte an den kürzeren gegenüberliegenden Seiten = Kleinspielfeld), freie Ecken (null = Grundform; sonst 3–32 Eckpunkte relativ zum Mittelpunkt vor der Drehung, z. B. Raute/Trapez/Vieleck; beim Kreis/Oval weiche Kurve durch die Punkte, Start mit 8 Punkten; eingebaute Tore nur bei 4 Ecken); behält die id über Szenen und wird interpoliert
- `Item`: id, Typ (player | ball | cone | goal | minigoal | pole | slalom | dummy | poleDummy/figureDummy = perspektivische Dummys | wall | ladder | hurdle | ring | flag | disc | rebounder | agility = Koordinationsraster 3×3/4×4 (Anzahl in der Beschriftung) | coach = Trainer mit Kürzel TR/CO/KT/TT | image = importiertes Bild (Bild-id in der Beschriftung) | crest = Wappen (Bild-id in der Beschriftung, leer = Platzhalter-Schild) | text | textbox), x, y, Drehung, Größe (Faktor, 1 = Standard; Spieler starten mit 1,5), Form (nur Spieler: Kreis | Dreieck | Kreuz | Trikot), Farbe (beim Textfeld: Hintergrund; beim Ball das Design, "training" = Trainingsball), Beschriftung (Nummer bzw. Text), Name (Namensschild unter dem Spieler), Hervorheben (Leuchtrahmen), Richtungspfeil (optional, fehlt = an)
- `Line`: Typ (pass | run | dribble | shot | line = Linie ohne Pfeil | free/freeArrow = Freihand ohne/mit Pfeil, Punkte beim Zeichnen vereinfacht), Wegpunkte (Start, beliebig viele Biegungen, Ende), rund oder eckig, Farbe, Muster (durchgezogen | gestrichelt | punktiert | strich-punktiert), Stärke (extra dünn | dünn | mittel | dick | extra dick), Schritt-Nummer (optional, 1–99). Dateiformat aktuell Version 5 (seit Version 2 Wegpunkte, seit Version 3 Zonen, seit Version 4 Textfelder, Namensschilder, Hervorheben, Zonen-Füllung, seit Version 5 Trainingsmaterial und Kleinspielfelder, seit Version 6 freie Zonen-Ecken, seit Version 7 Linienmuster/-stärken, Linie ohne Pfeil und Zonen mit beliebig vielen Ecken, seit Version 8 Schritt-Nummern, seit Version 9 Angaben zur Trainingsform, seit Version 10 Hürde/Ring/Fahne/Teller/Rebounder, seit Version 11 Bibliotheks-Bereich, seit Version 12 Eck-Ausschnitte, seit Version 13 Freihandlinien, seit Version 14 weitere Raster und eigenes Raster, seit Version 15 Trikot-Form und Trainer, seit Version 16 Rasen-/Linien-Design, Ball-Designs und Koordinationsraster, seit Version 17 Mähmuster, Lichtverlauf und weitere Linienstärken, seit Version 18 Spieler ohne Richtungspfeil und perspektivische Dummys, seit Version 19 importierte Bilder und Hintergrundbild, seit Version 20 verformbare Kreis-Zonen, Lichtquelle/-art, eigener Farbverlauf und eigene Zonen-Beschriftung, seit Version 21 Futsal, Halle, Korridor und Viertelfeld, seit Version 22 Rückzugslinien, Notizen unter dem Feld und Wappen); Version-1-Linien (Start, Ende, ein Kontrollpunkt) werden beim Laden umgewandelt.
- Koordinaten immer in Metern relativ zum Feld, nie in Pixeln. Umrechnung nur beim Zeichnen.
- Ein Item behält seine id über alle Szenen; die Animation interpoliert Position und Drehung zwischen aufeinanderfolgenden Szenen.
- `TrainingSession` (Einheit): Titel, Datum, Beginn, Art (Training | Taktik | Spielnachbesprechung | Spiel | Sonstiges), Mannschaft, Ziel, Notizen, Liste von Blöcken
- `Team` (Mannschaft): Name, Teamfarbe, Spieler (Nummer, Name, Position inkl. Rollen wie ET, TSP, RIV/LIV/ZIV, LOV/ROV, 6er/8er/10er, Schwimmer, 9er/falscher 9er – jede Rolle hat eine Grundposition für die Formationen, Startelf; Import per CSV, andere Spalten werden ignoriert, oder aus einem PDF-Spielbericht: Text wird lokal gelesen, Spalten = Heim/Gast, T/ET = Torwart, Abschnitt „Ersatz“ = nicht Startelf, Vorschau mit Häkchen vor der Übernahme); nur das Nötigste, keine weiteren persönlichen Daten. Formationen stellen die Startelf aufs Feld (als normale Spieler-Items, keine Verknüpfung; passen sich kleinen Feldern an). „Auf System ausrichten“ schiebt die schon aufgestellten Spieler (erkannt an Teamfarbe, Nummer, Name) auf die Plätze eines anderen Systems, wahlweise in einer neuen Szene. Namensschild wahlweise ganz, als Anfangsbuchstaben ("MM") oder ohne.
- Block: verweist per id auf eine Übung der Bibliothek (keine Kopie) oder ist ein freier Block (z. B. Trinkpause); Dauer in Minuten, Notiz

## Funktionsumfang nach Phasen
1. Spielfeld (Ganzfeld, Halbfeld, Strafraum, Ecke links/rechts für Eckbälle, Futsal, Halle mit Bande, Korridor, Viertelfeld, leere Fläche), responsiv
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
- Handy (schmaler Bildschirm): eigene, abgespeckte Ansicht (`src/phone/PhoneApp.tsx`) mit Bibliothek, Einheiten, Woche und Übungsansicht mit Abspielen; Zeichenwerkzeuge nur auf Tablet/PC.
- Alle Grafiken (Spieler, Ball, Hütchen, Tore) selbst als SVG/Konva-Formen erzeugen. Keine Grafiken, Figuren oder Layouts fremder Produkte übernehmen.

## Befehle
- `npm run dev` startet die App lokal
- `npm run build` prüft, ob alles kompiliert
- `npm test` führt die Tests aus

## Veröffentlichung
- GitHub Pages über `.github/workflows/deploy.yml`: jeder Push auf `main` testet, baut (mit `BASE_PATH=/<repo>/`) und veröffentlicht.
- Der Ordner `vorlagen/` (fremdes Referenzmaterial, Vereinsdateien) ist in `.gitignore` und darf nie ins Repository.
