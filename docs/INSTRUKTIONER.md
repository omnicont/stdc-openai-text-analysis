# Instruktioner för ItsSemantics Analysis App

Det här dokumentet sammanfattar hur du använder applikationen och vilka förutsättningar som krävs. Informationen baseras på README och tidigare diskussioner.

## Status och översikt

Applikationen består av en API-server (Node.js/Express) och en klient (React). Den analyserar text enligt See–Think–Do–Care med hjälp av OpenAI:s API. Analysen hanteras genom en kö i Redis och resultatet hämtas sedan av klienten.

För att kunna köra allt lokalt behövs:

1. **Node.js 18 eller högre**
2. **En Redis-server** som kör lokalt på port `6379`
3. **TLS-certifikat** (självsignerade) i projektroten (`server.key` och `server.crt`). Generera dem själv om de saknas.
4. **En `.env`-fil** i katalogen `server/` med:
   ```
   OPENAI_API_KEY=din_nyckel
   TEXT_LIMIT=1000
   ALLOWED_ORIGIN=https://localhost:3001
   PORT=3000
   REDIS_HOST=127.0.0.1
   REDIS_PORT=6379
   API_BASE_URL=https://localhost:3000
   ```

När dessa förutsättningar är uppfyllda kan du starta API-servern och därefter React-klienten. Öppna sedan `https://localhost:3001` i webbläsaren (acceptera de självsignerade certifikaten). Du får då ett gränssnitt där du kan mata in en text på 50–1000 tecken och klicka på **Analysera**. Resultatet visas som en punktlista under rubrikerna See, Think, Do och Care.

Uteblivna miljövariabler, en inaktiv Redis-instans eller saknade certifikat gör att servern inte startar som den ska.

## Installation och körning

```bash
# installera serverns beroenden
cd server && npm install

# installera klientens beroenden
cd ../client && npm install
```

Skapa certifikat om de saknas:

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout server.key -out server.crt -subj "/CN=localhost"
```

Starta därefter servern och klienten i separata terminaler:

```bash
# API-servern
cd server && npm run dev

# React-klienten
cd ../client && npm start
```

När allt är igång navigerar du till `https://localhost:3001` för att använda appen.

## Begränsningar och kostnadskontroll

- Endast HTTPS används.
- Inmatningar valideras och saneras på servern.
- Max 5 förfrågningar per minut och IP (rate limiting).
- OpenAI-nyckeln exponeras inte för klienten.
- Endast texter mellan 50 och `TEXT_LIMIT` tecken accepteras.

## Nästa steg

Den här instruktionen är tänkt att hjälpa dig köra applikationen lokalt. För att erbjuda nedladdningar eller leverera den till andra användare kan du paketera koden, exempelvis genom en zip-fil eller ett GitHub-repository där dessa instruktioner finns med.

