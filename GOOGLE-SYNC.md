# Google-Anmeldung und Synchronisierung aktivieren

Der Code und die Datenbankregeln sind vorbereitet. Ein echtes Supabase-Projekt und Google OAuth müssen einmal im eigenen Konto eingerichtet werden. Die vorhandene PIN funktioniert bis dahin weiter. Es werden keine kostenpflichtigen Dienste automatisch gebucht.

1. Unter https://supabase.com/dashboard ein Projekt im Free-Tarif anlegen. Die aktuelle Verfügbarkeit und Limits prüfen. Supabase ist ein separater Anbieter und nicht mit deinem Gemini-Schlüssel verbunden.
2. Im Supabase SQL Editor den vollständigen Inhalt von `supabase/schema.sql` ausführen. RLS nicht deaktivieren. So darf jeder angemeldete Benutzer nur den eigenen Datensatz lesen und schreiben.
3. In Supabase Authentication → URL Configuration:
   - Site URL: `https://ai-erstellung.onrender.com`
   - Redirect URL: `https://ai-erstellung.onrender.com/auth/callback`
4. In Google Cloud Console ein OAuth-Projekt bzw. einen OAuth-Webclient erstellen. Den Google-Login konfigurieren (bei Teststatus deine E-Mail als Testnutzer hinzufügen). Als erlaubte Redirect-URI die **Supabase-Callback-URL** aus Authentication → Providers → Google verwenden, beispielsweise `https://DEIN-PROJEKT.supabase.co/auth/v1/callback`. Nicht die Render-Callback-URL in dieses Google-Feld eintragen.
5. In Supabase unter Authentication → Providers → Google den Google Client ID und Client Secret sicher eintragen und den Provider aktivieren. Diese Zugangsdaten bleiben bei Supabase und gehören weder in Git noch in den Chat.
6. In Render → Environment sicher setzen:
   - `SUPABASE_URL`: deine Supabase-Projekt-URL, ohne Pfad.
   - `SUPABASE_PUBLISHABLE_KEY`: der Publishable Key aus den Supabase-Projekteinstellungen; bei älteren Projekten alternativ `SUPABASE_ANON_KEY`.
   - `ALLOWED_GOOGLE_EMAILS`: deine erlaubte Google-Adresse, bei Bedarf mehrere Adressen mit Kommas. Nur diese bestätigten Google-Konten bekommen Zugriff. So kann nicht jeder Besucher deine Gemini-Quote verwenden.
   - `APP_ORIGIN=https://ai-erstellung.onrender.com` ist optional auf Render, weil dort RENDER_EXTERNAL_URL vorliegt.
   - `GEMINI_API_KEY`, `APP_PASSWORD` und `NODE_ENV=production` erhalten.
   **Niemals Supabase service_role oder einen Secret/Admin-Key verwenden.**
7. Render neu bereitstellen. Auf der Login-Seite erscheint zusätzlich „Mit Google anmelden / Увійти через Google“. Deine PIN bleibt als lokale Alternative bestehen.
8. Mit derselben freigegebenen Google-Adresse auf Handy und PC anmelden. In Einstellungen wird das Konto und der Sync-Status angezeigt. Auf dem alten Gerät bei Bedarf „Lokale Chats übernehmen“ bestätigen. Import kopiert; die bisherigen lokalen Chats werden dabei nicht gelöscht.

## Prüfen

- Auf Gerät A einen Testchat schreiben. „Synchronisiert“ in Einstellungen abwarten.
- Auf Gerät B mit demselben Google-Konto anmelden, „Jetzt synchronisieren“ anklicken oder kurz warten. Der Chat sollte erscheinen.
- Umbenennen, Sprache/Wetterort ändern und erneut synchronisieren. Löschungen werden mit synchronisiert.
- Ein nicht freigegebenes Google-Konto muss abgewiesen werden. Andere Konten dürfen keine Daten lesen, auch nicht per Datenbank-API (RLS).
- Bei „Cloud-Speicher nicht verfügbar“ SQL-Schema, RLS, Projektstatus und Schlüssel prüfen. Lokale Daten bleiben erhalten. Nach längerem Stillstand muss ein kostenloses pausiertes Supabase-Projekt ggf. im Dashboard fortgesetzt werden.

Ein Code-Deployment allein aktiviert Google OAuth nicht. Ein echter Google- und Zwei-Geräte-Test ist erst nach diesen Kontoeinstellungen möglich. In der Codex-Umgebung muss zusätzlich die konkrete Supabase-Projekt-Domain in der Netzwerkliste freigegeben werden; Render hat davon getrennte Netzwerkeinstellungen.
