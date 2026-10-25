# Публічна HTTPS-адреса Wolke

Наявний сайт: https://ai-erstellung.onrender.com . Програма працює на Render; комп’ютер користувача може бути вимкнений.

Для вже створеного сервісу Render з увімкненим Auto-Deploy коміти `main` автоматично запускають розгортання. Збережені `GEMINI_API_KEY` і Firebase-конфігурація залишаються на Render та не потрапляють у Git.

## Нове встановлення

1. На https://dashboard.render.com увійди через GitHub і підключи `Timix249/ai-erstellung`.
2. Вибери New → Web Service, мову Node, гілку `main`, кореневий каталог залиш порожнім.
3. Build Command: `npm ci --omit=dev`. Start Command: `npm start`.
4. Вибери **Free — $0/month**. Не активуй платний тариф або додаткові платні послуги.
5. У Environment вкажи `NODE_VERSION=24`, `NODE_ENV=production`, власний `GEMINI_API_KEY` та Firebase-конфігурацію з [GOOGLE-SYNC.md](GOOGLE-SYNC.md). Не публікуй секрети в чаті чи на знімках екрана. Ключ із Codex не експортується автоматично на Render.
6. Deploy. Після статусу Live відкрий надану HTTPS-адресу на будь-якому пристрої. Натисни кнопку Google. PIN не потрібний.

Альтернатива для нового встановлення: New → Blueprint і файл `render.yaml`. Firebase-конфігурацію потрібно вказати в Render → Environment.

Після простою Render Free може запускатися повільно. Безкоштовні квоти Gemini незалежні від тарифу Render. Перевір актуальні умови тарифів. Для власного домену встанови `APP_ORIGIN` у точну HTTPS-адресу без `/` у кінці. Для адреси Render цього не потрібно.

`GET /healthz` дозволяє перевірити версію без пароля; жодних секретів він не показує. Чати синхронізуються через Firestore окремо для кожного Google-акаунта.
