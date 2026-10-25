# Google-Anmeldung und Gerätesynchronisierung mit Firebase

Die Anwendung ist auf Firebase von Google vorbereitet. Supabase ist nicht nötig. Die Anmeldung erfolgt ausschließlich über Google und steht allen bestätigten Google-Konten offen. Es werden keine kostenpflichtigen Dienste automatisch aktiviert.

1. Öffne https://console.firebase.google.com/ und erstelle ein Projekt im **Spark-Tarif** oder füge Firebase zu deinem bestehenden Google-Cloud-Projekt hinzu. Analytics ist für Wolke nicht erforderlich. Wenn Zahlungsdaten oder ein kostenpflichtiges Upgrade verlangt werden, stoppe dort.
2. Unter **Authentication → Sign-in method / Anmeldemethode** Google aktivieren. Die Support-E-Mail wählen und speichern. Firebase richtet die Google-Anbindung ein; du musst keinen Google-Client-Secret in Wolke hinterlegen.
3. Unter **Authentication → Settings → Authorized domains / Autorisierte Domains** `ai-erstellung.onrender.com` hinzufügen (ohne https und ohne Pfad).
4. **Firestore Database → Create database** öffnen. Die Standard-Datenbank `(default)` im **Produktionsmodus** erstellen, nicht mit öffentlichen Testregeln. Eine passende kostenlose Region wählen, falls verfügbar.
5. Unter Firestore → Rules den vollständigen Inhalt von `firebase/firestore.rules` einfügen und veröffentlichen. Die Regeln erlauben nur dem Besitzer Zugriff auf seinen Datensatz. Regeln niemals auf pauschal `allow read, write: if true` ändern.
6. In Firebase → Projekteinstellungen → Allgemein eine **Web-App** (`</>`) namens Wolke registrieren. Firebase Hosting muss nicht aktiviert werden; die Website bleibt bei Render. Aus der angezeigten `firebaseConfig` werden diese Werte gebraucht:

   | Firebase-Konfiguration | Render-Umgebungsvariable |
   |---|---|
   | apiKey | FIREBASE_API_KEY |
   | projectId | FIREBASE_PROJECT_ID |
   | authDomain | FIREBASE_AUTH_DOMAIN |
   | appId | FIREBASE_APP_ID |

   Nutze für authDomain die Standardadresse `DEIN-PROJEKT.firebaseapp.com`.
7. Render → ai-erstellung → Environment: die Firebase-Werte eintragen. `GEMINI_API_KEY` und `NODE_ENV=production` behalten. `APP_PASSWORD` und `ALLOWED_GOOGLE_EMAILS` werden nicht mehr verwendet und können entfernt werden. Alle Nutzer teilen die Gemini-Quote des Servers. Firebase-Web-API-Key und Gemini-API-Key haben unterschiedliche Zwecke: die Werte aus der Firebase-Web-App verwenden. Private Service-Account-Dateien oder Admin-Schlüssel sind nicht erforderlich und dürfen nicht hochgeladen werden.
8. In Render speichern und neu bereitstellen. Anschließend auf Wolke „Mit Google anmelden“ anklicken. Popups erlauben. Auf Handy und PC dasselbe Google-Konto verwenden. Die Sitzung wird mit sicheren HttpOnly-Cookies gespeichert und automatisch erneuert, auch nach einem Serverneustart. Das Refresh-Cookie gilt bis zu einem Jahr und wird bei Erneuerung verlängert. Browser können Cookies früher löschen; nach Abmeldung, Widerruf durch Google oder gelöschten Browserdaten ist eine neue Anmeldung nötig.
9. In Einstellungen wird das Konto und der Sync-Status angezeigt. Auf dem alten Gerät „Lokale Chats übernehmen“ bestätigen, wenn alte PIN-Chats synchronisiert werden sollen. Danach auf dem zweiten Gerät „Jetzt synchronisieren“ drücken oder kurz warten.

## Prüfen

- Chat auf Gerät A schreiben und „Synchronisiert“ abwarten; auf Gerät B anmelden und den Chat aus der Liste wählen.
- Umbenennen, Sprache/Wetterort ändern und die Änderung auf dem anderen Gerät prüfen. Löschungen werden ebenfalls synchronisiert.
- Bei `auth/unauthorized-domain` die Render-Domain in Firebase Authentication freigeben.
- Bei `auth/operation-not-allowed` den Google-Anbieter aktivieren.
- Bei Firestore-Zugriffsfehlern Datenbank, Regeln und Projekt-ID prüfen. Bei Quotenfehlern kostenlose Kontingente prüfen, nicht automatisch auf einen kostenpflichtigen Tarif wechseln.
- Jedes bestätigte Google-Konto darf sich anmelden. Die Firebase-Regeln verhindern, dass ein Konto Daten eines anderen Kontos liest oder schreibt.

Der Firebase-Spark-Tarif hat begrenzte kostenlose Kontingente. Die KI nutzt weiterhin Gemini und dessen separate Quote. Das App-Deployment allein erstellt kein Firebase-Projekt. Ohne die Konfiguration zeigt die Anmeldung einen verständlichen Einrichtungsfehler; es gibt keinen PIN-Zugang.
