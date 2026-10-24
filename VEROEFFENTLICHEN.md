# Wolke als echte HTTPS-Website veröffentlichen

Die Website ist fertig. Die Codex-Umgebung bereitzustellen erzeugt keine öffentliche Website-Adresse. Für diese braucht es einen Webhoster. Die Datei render.yaml bereitet Render als Hoster vor.

## Einmalige Einrichtung bei Render

1. Melde dich auf https://dashboard.render.com an und verbinde dein GitHub-Konto.
2. Stelle sicher, dass die Projektdateien einschließlich render.yaml im Repository Timix249/ai-erstellung vorhanden sind. Niemals .env hochladen. Ein Paket ohne Schlüssel liegt unter /workspace/wolke-veroeffentlichen.zip.
3. Wähle in Render „New“ → „Blueprint“ und das Repository. Render liest render.yaml und legt den Node-Webdienst an.
4. Hinterlege GEMINI_API_KEY direkt im geschützten Render-Eingabefeld. Der in Codex gespeicherte Proxy-Schlüssel wird nicht zu Render exportiert. Verwende deinen Schlüssel aus Google AI Studio. Render erzeugt APP_PASSWORD automatisch.
5. Nach erfolgreichem Deployment zeigt Render die öffentliche HTTPS-Adresse. Öffne diese. Benutzername beliebig, als Passwort den Wert von APP_PASSWORD aus deinen Render-Umgebungsvariablen verwenden. Diesen Wert und den API-Schlüssel nicht öffentlich teilen.
6. Prüfe eine Chatfrage, Stimme sowie Kamera-/Bildschirmfreigabe. Für die Render-Adresse ist APP_ORIGIN nicht nötig: Der Server verwendet RENDER_EXTERNAL_URL. Bei eigener Domain APP_ORIGIN auf deren exakte HTTPS-Origin setzen.

Der Blueprint wählt den kostenlosen Webdienst, sofern dein Konto diesen Tarif unterstützt. Er kann bei Inaktivität einschlafen; der erste Aufruf dauert dann länger. Prüfe die aktuellen Tarifbedingungen im Render-Dialog. Gemini-Kosten und Kontingente fallen unabhängig davon an. Kostenpflichtige Upgrades sind nicht erforderlich vorbereitet.

Die App verweigert in Produktion Zugriff ohne APP_PASSWORD. Alle Medien laufen weiterhin über denselben sicheren Server; keine API-Schlüssel im Browser. Der Browser benötigt keine installierten KI-Modelle.
