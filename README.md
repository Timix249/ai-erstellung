# Wolke – persönlicher Cloud-KI-Assistent

Deutscher Chat, Spracheingabe, KI-Sprachausgabe, Kamera- und Bildschirmbilderkennung. Die KI läuft über Google Gemini in der Cloud. Auf deinem PC werden keine KI-Modelle installiert. Browser-APIs erfassen freigegebene Medien; das Node.js-Backend hält den API-Schlüssel und spricht mit Google Gemini.

## Starten

Voraussetzung: Node.js 24 oder neuer (getestet mit Node 24) und ein Gemini-API-Projekt mit passendem Kontingent bzw. aktivierter Abrechnung und Zugriff auf die konfigurierten Modelle.

```sh
npm ci
cp .env.example .env
# .env mit einem Editor öffnen und GEMINI_API_KEY setzen
npm start
```

Für Entwicklung: `npm run dev`. Standardport: 3000. Lokal im Browser `http://localhost:3000` öffnen. In der Cloud HTTPS über deinen Hostinganbieter verwenden. Es gibt absichtlich keinen Demo-Modus mit erfundenen KI-Antworten: Ohne Schlüssel zeigt die App eine klare Meldung.

In `.env` **GEMINI_API_KEY** eintragen. Erstelle den Schlüssel unter https://aistudio.google.com/apikey . Du brauchst keinen OpenAI-Schlüssel. Für eine Veröffentlichung zusätzlich ein langes, zufälliges **APP_PASSWORD**, **NODE_ENV=production** und **APP_ORIGIN=https://deine-domain.example** (ohne abschließenden Schrägstrich) setzen. Der Browser fragt nach einer HTTP-Basic-Anmeldung: Benutzername beliebig, Passwort gleich APP_PASSWORD. Das Passwort ausschließlich über HTTPS verwenden. Die App ist für eine Person, nicht für mehrere Benutzer konzipiert.

Optional lassen sich `PORT`, `GEMINI_CHAT_MODEL`, `GEMINI_AUDIO_MODEL` und `GEMINI_SPEECH_MODEL` anpassen. Standard: `gemini-3.1-flash-lite`, `gemini-3.1-flash-lite`, `gemini-3.8-flash-tts`. Das Chatmodell muss Text und Bilder unterstützen. Schlüssel niemals in `public/`, Git, Screenshots oder Chatnachrichten kopieren. `.env` ist von Git und Docker ausgeschlossen.

## Benutzen

- Nachricht eingeben, Enter zum Senden, Shift+Enter für einen Zeilenumbruch. Chat bleibt nur im Tab-Arbeitsspeicher. Antworten erscheinen als sicherer Klartext, einschließlich Code; HTML wird nicht ausgeführt.
- **Mikrofon:** Browserfreigabe erteilen, sprechen, erneut klicken. Nach dem Stopp (spätestens nach 60 Sekunden) wird die Aufnahme zur Transkription übertragen. Den erkannten Text prüfen und anschließend senden. „Alle Freigaben … stoppen“ verwirft die laufende Aufnahme.
- **Kamera / Bildschirm:** Vorschau ist lokal. Bildschirmfreigabe benötigt einen unterstützten Desktop-Browser; Audio des Bildschirms wird nicht aufgenommen. Eine neue visuelle Quelle ersetzt die bisherige. Freigabe im Browser oder in der App jederzeit stoppen.
- **Einzelbild aufnehmen:** Ein JPEG (maximal 1280 Pixel pro Seite) wird angehängt. Erst „Senden“ übermittelt das Bild mit der Frage. Kein dauerhaftes Live-Video wird gestreamt. Ein angehängtes Bild lässt sich vor dem Senden entfernen. „Alle Freigaben … stoppen“ entfernt es ebenfalls.
- **Vorlesen:** Pro Antwort oder automatisch aktivieren. Die Stimme ist KI-generiert. „Alle Freigaben … stoppen“ beendet auch die Wiedergabe und bricht aktive Browseranfragen ab. Bereits beim Anbieter verarbeitete Daten und entstandene Kosten können nicht zurückgerufen werden.

Mikrofon/Kamera benötigen HTTPS oder localhost und Browserberechtigungen. Bei verweigertem Zugriff über das Schlosssymbol des Browsers erneut freigeben. Bildschirmfreigabe ist auf Mobilgeräten oft nicht verfügbar. Automatische Audiowiedergabe kann vom Browser blockiert werden; dann „Vorlesen“ anklicken.

## Veröffentlichen (Cloud)

Auf einem Node.js-Hostingdienst, z. B. Render, Railway oder einem eigenen Server:

1. Repository bereitstellen. Build: `npm ci --omit=dev`. Start: `npm start`. Alternativ das enthaltene Dockerfile bauen und ausführen; niemals den API-Schlüssel ins Image schreiben.
2. In den **serverseitigen Umgebungsvariablen** `GEMINI_API_KEY`, `APP_PASSWORD`, `NODE_ENV=production` und `APP_ORIGIN` mit der öffentlichen HTTPS-Origin setzen. `PORT` wird meist vom Anbieter vorgegeben.
3. HTTPS aktivieren. Reverse Proxy muss die öffentliche Origin unverändert als Host weiterleiten; `APP_ORIGIN` erlaubt diese Origin auch bei TLS-Terminierung vor Node. API- und Frontendpfade unter derselben Origin betreiben. Uploadlimit mindestens 12 MB plus Multipart-Overhead, Antworttimeout mindestens 100 Sekunden.
4. Website öffnen und anmelden. Gesundheitsanzeige prüfen, eine deutsche Frage senden, Mikrofon transkribieren, ein unkritisches Kamerabild beschreiben lassen und Stimme testen.

In Produktion verweigert der Server ohne APP_PASSWORD alle Zugriffe. Keine öffentlichen ungeschützten Deployments. Die App hat zusätzlich ein einfaches In-Memory-Limit von 30 API-Anfragen pro Minute und IP. Hinter einem Proxy können alle Benutzer dieselbe IP teilen; für diese persönliche Anwendung ist das absichtlich konservativ. Mehrere Instanzen benötigen einen gemeinsamen externen Rate-Limiter. Kein `trust proxy` blind aktivieren. Für einen Betrieb mit mehreren Benutzern sind individuelle Anmeldung, Quoten und ein geeignetes Datenschutzkonzept zusätzlich nötig.

## Daten, Kosten und Grenzen

Text, Bilder, Transkription und Stimme verursachen echte API-Kosten. Audio wird maximal 60 Sekunden aufgenommen und serverseitig auf 12 MB begrenzt; Chatantworten auf 4.096 Ausgabetokens, Sprachausgabe auf 4.000 Zeichen. Der Browser sendet maximal 30 Textnachrichten als Kontext und nur das aktuell angehängte Bild. Frühere Bilder werden nicht erneut geschickt. Bei langen Chats kann Kontext verloren gehen.

Diese App speichert Ton/Bilder/Chats standardmäßig nicht dauerhaft. Uploads liegen vorübergehend im Arbeitsspeicher des Servers; Vorschaubilder und Verlauf im Tab. Es gibt keine Datenbank, keinen Cloudspeicher und keine Inhaltsprotokollierung durch die App. Hostinganbieter können Zugriffsmetadaten protokollieren. Bei Google Gemini gelten dessen eigene Regeln, einschließlich möglicher Aufbewahrung zur Missbrauchserkennung. Die Verarbeitung und mögliche Datennutzung hängen von Googles Bedingungen und deinem Tarif ab. Insbesondere können Inhalte bei unbezahlten Angeboten zur Produktverbesserung verwendet werden; keine vertraulichen Daten übertragen. Details: https://ai.google.dev/gemini-api/terms . Preise: https://ai.google.dev/gemini-api/docs/pricing . Budgets und Alarme im Google-Cloud-Projekt setzen; ein hartes Euro-Limit wird von der App nicht erzwungen.

Die App kann Dinge und Bildschirminhalte beschreiben und bei Code helfen, führt aber keine Programme oder Computeraktionen aus. Bilderkennung kann irren. Keine vertraulichen Inhalte oder fremden Personen ohne Berechtigung übertragen. Vor einer öffentlichen Veröffentlichung eigene Datenschutz-/Impressumsanforderungen prüfen und passende Angaben ergänzen.

## Prüfung und Fehlersuche

`npm test` prüft echte HTTP-Routen mit simuliertem Google Gemini-Dienst: fehlender Schlüssel, Chat mit Bild, Audio und Fehlerbehandlung. `node --check server.js` und `node --check public/app.js` prüfen die Syntax. Echte Google Gemini-Antworten erfordern deinen Schlüssel; Browserfreigaben müssen in einem echten Browser geprüft werden.

- **Schlüssel fehlt:** `.env` neben server.js oder Hosting-Variable setzen und neu starten.
- **HTTP 401 von Google Gemini:** Schlüssel bzw. Projektberechtigung prüfen.
- **Limit/Guthaben:** Google Gemini-Projektabrechnung, verfügbare Modelle und Limits prüfen.
- **Fremde Website blockiert:** APP_ORIGIN muss exakt zur öffentlichen URL passen.
- **Freigabe nicht möglich:** HTTPS, Browserunterstützung, Geräte und Berechtigungen prüfen.
- **Kein Ton:** Browserlautstärke und automatische Wiedergabe prüfen; „Vorlesen“ manuell anklicken.

Die Startbefehle nutzen `--use-env-proxy`, damit Node die HTTPS_PROXY/HTTP_PROXY-Umgebung und vorhandene CA-Konfiguration respektiert. TLS-Verifikation bleibt aktiviert.

Netzwerk benötigt `generativelanguage.googleapis.com` über HTTPS und für Installation `registry.npmjs.org`. Kein externes CDN, keine Schriftartendownloads und keine weiteren Laufzeitdienste.
