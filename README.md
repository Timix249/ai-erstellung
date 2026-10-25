# Wolke

Світлий українськомовний чат із Gemini, погодою та налаштуваннями. Інтерфейс автоматично адаптується до телефона, планшета й комп’ютера. Відповіді з’являються поступово, одразу після першого фрагмента від Gemini. Назва залишається **Wolke**.

## Запуск

Потрібен Node.js 24 або новіший.

```sh
npm ci
cp .env.example .env
# Укажи GEMINI_API_KEY у .env, лише на сервері.
npm start
```

Для розробки: `npm run dev`. Типовий порт — 3000. Локальна адреса — http://localhost:3000. Для віддаленого використання потрібен хостинг із HTTPS. Усі моделі працюють у хмарі; на пристрої користувача моделі не встановлюються.

Ключ можна створити на https://aistudio.google.com/apikey . Ключ ніколи не надсилається до браузера. `.env` виключено з Git і Docker. Під час розгортання використовуй захищені змінні середовища хостингу.

## Налаштування

| Змінна | Значення |
|---|---|
| `GEMINI_API_KEY` | Серверний ключ Google Gemini |
| `APP_PASSWORD` | PIN для входу; обов’язковий у production |
| `NODE_ENV` | `production` для публічного сервера |
| `PORT` | Порт сервера, типово 3000; Render надає автоматично |
| `APP_ORIGIN` | Точна HTTPS-адреса власного домену без кінцевого `/` |
| `GEMINI_CHAT_MODEL` | Типово `gemini-3.5-flash-lite` |
| `GEMINI_AUDIO_MODEL` | `gemini-3.5-flash-lite`, для сумісності з аудіо-API |
| `GEMINI_SPEECH_MODEL` | `gemini-3.8-flash-tts` |

На Render використовується `RENDER_EXTERNAL_URL`, якщо `APP_ORIGIN` не вказано. На сторінці входу є лише Wolke та поле PIN; ім’я користувача не потрібне. PIN дорівнює `APP_PASSWORD`. Передавай PIN лише через HTTPS. Сеанс зберігається до 7 днів через HttpOnly/SameSite-cookie (Secure у production). Після перезапуску сервера або зміни PIN потрібно ввійти знову. П’ять невдалих спроб блокують вхід на 10 хвилин. Кнопка «Вийти» завершує сеанс, але не видаляє локальну історію чатів. Не відключай перевірку TLS. Команда запуску використовує `--use-env-proxy`, щоб працювати з налаштованим HTTPS-проксі та довіреними CA.

## Чати й приватність

- Новий чат створюється кнопкою «Новий чат». Список зліва на комп’ютері та випадаючий список на телефоні дозволяють продовжити розмову.
- Текстова історія зберігається в `localStorage` цього браузера, зокрема після закриття вкладки. Без підключеного Google-акаунта синхронізації між пристроями немає. У приватному режимі браузер може видалити історію після закриття.
- Історію можна видалити кнопкою видалення чату. Очищення даних браузера видаляє всі чати. Якщо сховище переповнене або заблоковане, застосунок повідомляє, що збереження не вдалося.
- Для кожної відповіді передаються до 30 останніх текстових повідомлень. Старіші повідомлення збережені для читання, але модель може не пам’ятати їх. Перервана відповідь не потрапляє до збереженого контексту.
- Немає панелі камери, мікрофона чи показу екрана. Браузер не запитує доступу до цих пристроїв. Старі захищені серверні маршрути аналізу зображень і транскрипції збережені для сумісності.
- Кнопка «Озвучити» передає текст відповіді до Gemini. Повторне натискання зупиняє генерацію або відтворення. Аудіо не записується на диск.
- Текст відображається без виконання HTML. Модель не керує комп’ютером і не виконує код.

Google обробляє надіслані дані за своїми правилами; на безкоштовних тарифах дані можуть використовуватися для вдосконалення продуктів. Не надсилай конфіденційні дані. Умови: https://ai.google.dev/gemini-api/terms . Ціни: https://ai.google.dev/gemini-api/docs/pricing . Запити та озвучення можуть витрачати безкоштовну квоту або мати вартість. Застосунок не гарантує жорсткого грошового ліміту. Не активуй платну абонплату, якщо плануєш використовувати лише безкоштовну квоту.

## Швидкість

Сервер використовує `streamGenerateContent` і передає фрагменти тексту до браузера без очікування завершення всієї відповіді. Інструкція просить відповідати стисло, але повно для програмування. Текст оновлюється не частіше одного разу на кадр. Ліміт відповіді — 4096 токенів. Сповільнення API Google і запуск Render Free після простою не контролюються застосунком. Штучного утримання безкоштовного сервера активним немає.

На ПК Enter надсилає, Shift+Enter створює новий рядок. На сенсорному пристрої Enter створює новий рядок, а стрілка надсилає повідомлення. Квадрат зупиняє активний запит. Поле вводу не закривається під час відповіді, можна набирати наступне повідомлення.

## Розгортання

Інструкція — [VEROEFFENTLICHEN.md](VEROEFFENTLICHEN.md). На Render Node 24: build `npm ci --omit=dev`, start `npm start`, тариф **Free**. Не додавай платних послуг. Потрібні `GEMINI_API_KEY`, `APP_PASSWORD`, `NODE_ENV=production`. Для початкового створення через Blueprint є `render.yaml`. Увімкнений Auto-Deploy розгортає нові коміти гілки `main`; зміни коду самі не змінюють тариф і збережені секрети Render.

Відкритий маршрут `GET /healthz` повертає лише стан і версію застосунку без конфігурації чи секретів. `GET /api/health` захищений паролем і перевіряє наявність ключа, але не гарантує працездатності Google. Інші маршрути також захищені. Для персонального використання є ліміт 30 API-запитів на хвилину та IP. За проксі користувачі можуть ділити одну IP-адресу; для багатокористувацької системи потрібні окрема авторизація, спільний rate-limiter та квоти.

## Перевірка

`npm test` — HTTP-тести з імітацією Gemini: українські інструкції, помилки, захист, аудіо, часткові UTF-8-фрагменти, потокова відповідь та її скасування. Вони не витрачають квоту API. `node --check server.js` і `node --check public/app.js` перевіряють синтаксис. Справжній Gemini потребує дійсного ключа й доступного контингенту.

## PIN, погода та встановлення

На сторінці входу є лише **Wolke** та **PIN:** — ім’я користувача не потрібне. Поточний `APP_PASSWORD` залишається PIN. Після зміни PIN або перезапуску сервера потрібно ввійти знову. У production сесійний cookie захищений прапорцями Secure, HttpOnly і SameSite=Strict; п’ять неправильних спроб блокують вхід на 10 хвилин.

Кнопка ⚙ відкриває налаштування: місто для погоди (типово **Germersheim**), короткі/звичайні/докладні відповіді, збільшений текст та автоматичне озвучення. Налаштування зберігаються локально на пристрої, як і історія чатів.

Погода надходить із Open-Meteo: поточна температура, відчутна температура, вітер і триденний прогноз. Wolke отримує ці дані як контекст, якщо запит стосується погоди. Вони не вигадуються моделлю; якщо сервіс недоступний, інтерфейс і помічник повідомляють про це. Назва міста використовується для геокодування; точну геолокацію пристрою застосунок не запитує. Дані кешуються на 10 хвилин, віджет оновлюється кожні 15 хвилин у видимій вкладці. Це прогноз, а не гарантія фактичної погоди.

Для некомерційного персонального використання публічного Open-Meteo API ключ не потрібен. Джерело: https://open-meteo.com/ . Для комерційного використання перевір умови Open-Meteo. Серверу потрібен доступ до `api.open-meteo.com` і `geocoding-api.open-meteo.com`; налаштований мережевий allowlist має їх містити. Збереження allowlist у чернетку Codex саме по собі не застосовує його до активної машини.

Додано власний SVG-логотип, favicon, Apple touch icon та `manifest.webmanifest` з іконками 192/512 і maskable. На підтримуваних телефонах можна вибрати «Додати на головний екран» у меню браузера. Маніфест не робить ШІ офлайн: для чату та актуальної погоди потрібен інтернет. Медіа й API-ключі не кешуються service worker’ом; service worker не реєструється.

При HTTP 404/502/503/504 текстовий Gemini-запит може один раз перейти на перевірену модель gemini-3.5-flash-lite, якщо інша модель налаштована у середовищі. Після початку відповіді повторного запиту немає, щоб не дублювати текст. Вичерпані квоти та неправильний ключ не обходяться. Погода повторює тимчасово невдалий запит не більше одного разу. Браузер читає потік через getReader для сумісності з мобільними Safari.

Якщо серверний доступ до Open-Meteo недоступний, віджет отримує погоду напряму з браузера через ті самі офіційні HTTPS-API. API-ключі при цьому не передаються. Геолокація не запитується.

## Вебпошук

У налаштуваннях увімкни «Шукати в інтернеті». Застосунок отримує публічні RSS-результати Bing, передає заголовки та уривки до Gemini й додає посилання. Повні сторінки не читаються. Окремий Google Search Grounding не викликається; його вичерпана квота більше не блокує чат. Можливі звичайні витрати/квоти Gemini та обмеження доступності Bing. Для роботи потрібен HTTPS-доступ до www.bing.com. Дані кешуються п’ять хвилин. При помилці пошуку відповідь явно позначено як неперевірену в інтернеті. Пошуковий текст передається Bing; не вводь секрети. Живий пошук із робочої машини наразі обмежено її мережевими правилами; модуль перевірено імітацією RSS і помилок.

## Мови та інструменти чату

У налаштуваннях і на сторінці PIN доступні Deutsch / Українська. Вибір зберігається на пристрої та передається серверу як мова відповіді. Раніше збережені повідомлення не перекладаються. Пошук чатів перевіряє назви й текст. Чат можна перейменувати. Відповіді підтримують заголовки, жирний текст, посилання та блоки коду; HTML не виконується. Кнопки дозволяють копіювати текст або код і повторно створити останню відповідь. Повторна генерація використовує API-квоту; при помилці попередня відповідь залишається у збереженій історії.

## Google-Anmeldung und Synchronisierung über Firebase

Einrichtung: [GOOGLE-SYNC.md](GOOGLE-SYNC.md). Es wird Firebase Authentication mit Google und Cloud Firestore verwendet, kein Supabase. Ohne Konfiguration bleibt die PIN-Anmeldung unverändert; die Google-Schaltfläche erscheint erst bei vollständig vorhandenen Firebase-Einstellungen.

Benötigt werden FIREBASE_API_KEY, FIREBASE_PROJECT_ID, FIREBASE_AUTH_DOMAIN, optional FIREBASE_APP_ID aus der Firebase-Web-App-Konfiguration sowie ALLOWED_GOOGLE_EMAILS. Die Firebase-Web-Konfiguration ist öffentlich und kein privater Admin-Schlüssel; Gemini-Schlüssel und Sitzungstoken bleiben serverseitig bzw. in HttpOnly-Cookies. Firebase wird lokal gebündelt (`npm run build`, automatisch nach `npm ci`); kein Firebase-SDK-CDN. Nur die von Firebase benötigten Google-Authentifizierungsdienste sind in CSP freigegeben. OAuth-Popup wird auf ausdrücklichen Klick geöffnet.

Das Google-ID-Token wird vom Backend über Firebase accounts:lookup validiert; Projekt, Aussteller, UID, bestätigte E-Mail, Google-Anmeldeprovider und Freigabeliste werden zusätzlich geprüft. Zugriff/Refresh-Tokens liegen in HttpOnly-Cookies, nicht in localStorage. Der Server verwendet das persönliche Firebase-ID-Token auch für Firestore; ein Service-Account oder Admin-Key wird nicht verwendet. Die Regeln in firebase/firestore.rules müssen veröffentlicht werden. Nur der jeweilige Besitzer darf auf wolke_users/{uid} zugreifen.

Chats und Einstellungen werden nach Benutzer-ID getrennt gespeichert. Alte PIN-Chats werden erst nach Bestätigung übernommen. Lokale Änderungen bleiben bei Offline-Nutzung erhalten. Versionsnummern und Firestore-updateTime verhindern paralleles Überschreiben. Bei gleichzeitigen Änderungen desselben Chats gewinnt der neuere Chat-Zeitstempel. Löschmarkierungen verhindern Wiederherstellung aus älteren Kopien.

Jeder Kontostand wird als ein Firestore-Dokument gespeichert. Es gilt eine Schutzgrenze von 750 KB UTF-8-JSON und maximal 200 Chats; größere lokale Verläufe bleiben lokal erhalten und die Synchronisierung meldet einen Fehler. Kostenlose Spark-Kontingente für Dokumentzugriffe und Authentifizierung gelten zusätzlich. Die Synchronisierung erfolgt nach Änderungen, beim Wiederöffnen und alle 30 Sekunden im sichtbaren Tab; unveränderte Daten werden nicht erneut geschrieben. Supabase-Konfigurationen werden nicht mehr verwendet; eventuelle alte Supabase-Daten werden nicht automatisch gelöscht oder migriert.

Ein echter Login und geräteübergreifender Live-Test sind erst mit deinem Firebase-Projekt möglich. Integrationstests verwenden einen simulierten Firebase-Dienst. Die Codex-Netzwerkliste benötigt für Tests identitytoolkit.googleapis.com, securetoken.googleapis.com, firestore.googleapis.com sowie gegebenenfalls die projektspezifische Auth-Domain.
