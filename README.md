# See Think Do Care — Text Analysis with OpenAI API

A secure Node.js/Express API with a React client for text analysis based on the See–Think–Do–Care framework, powered by OpenAI models. Runs locally with HTTPS and Redis as the job queue backend.

## Requirements

- Node.js **18+** (the server exits with an error if an older version is used)
- Redis running on `127.0.0.1:6379`
- Self-signed TLS certificates in the project root: `server.key` and `server.crt`
- A valid `OPENAI_API_KEY`

Generate certificates if missing:

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout server.key -out server.crt -subj "/CN=localhost"
```

## Installation

Replace `/path/to/itssemantics` with the folder you cloned from GitHub.

```bash
cd /path/to/itssemantics/server && npm install
cd ../client && npm install
```

### On macOS with Homebrew

```bash
brew install node redis
brew services start redis
```

See [docs/MAC_INSTALL.md](docs/MAC_INSTALL.md) for a detailed walkthrough.

## Configuration

Create `server/.env` with:

```
OPENAI_API_KEY=YOUR_API_KEY
TEXT_LIMIT=1000
ALLOWED_ORIGIN=https://localhost:3001
PORT=3000
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
API_BASE_URL=https://localhost:3000
```

The server verifies that `OPENAI_API_KEY` is present at startup and exits with an error if it is missing. Texts must be between **50** and `TEXT_LIMIT` characters. The rate limit is configured to 5 requests per minute per IP.

## Running the application

Start the API (https://localhost:3000):

```bash
cd /path/to/itssemantics/server
npm run dev
```

Start the React client (https://localhost:3001):

```bash
cd /path/to/itssemantics/client
npm start
```

Open <https://localhost:3001> in your browser and accept the self-signed certificate.

## Using the web UI

1. Open the client in your browser.
2. Paste your text (**50–TEXT_LIMIT** characters).
3. Select the model (`gpt-4` or `gpt-3.5-turbo`).
4. Submit and wait for the result — the client polls job status automatically.

If you encounter CORS errors, ensure `ALLOWED_ORIGIN` in `.env` matches exactly `https://localhost:3001`.

## API (optional)

The backend also exposes a simple job API.

### Create analysis job

- **POST** `/api/analysis`
- Body: `{ "text": "At least 50 characters...", "model": "gpt-4" }`
- Response: `{ "id": "12345", "estimatedWait": "1.2 sec" }`

### Get job status/result

- **GET** `/api/analysis/:id`
- Response example: `{ "status": "completed", "analysis": "..." }`
- Possible statuses: `pending`, `completed`, `cancelled`, `error`

### Cancel a job

- **DELETE** `/api/analysis/:id`
- Response example: `{ "status": "cancelled" }`

## Security and cost control

- All traffic uses HTTPS.
- Inputs are validated and sanitized server-side using `express-validator`.
- API requests are rate limited with `express-rate-limit`.
- The OpenAI API key is kept server-side and never exposed to the client.
- CORS is restricted to the configured origin.
- Text length is limited by the `TEXT_LIMIT` environment variable.

## Troubleshooting

- **Server exits immediately**: ensure `server.crt` and `server.key` exist in the project root.
- **Status shows `error`**: verify that Redis is running and that `OPENAI_API_KEY` is set in `server/.env`.

## Documentation in Swedish

For a full guide in Swedish on how to run the app and what prerequisites are required, see [docs/INSTRUKTIONER.md](docs/INSTRUKTIONER.md).
