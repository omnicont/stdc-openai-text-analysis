# ItsSemantics Analysis App

This project contains a secure Node.js/Express API and a React client for analyzing text via OpenAI models.

## Prerequisites

- Node.js **18+** (the server exits with an error if an older version is used)
- Redis server running locally on port `6379` (required for the job queue)

## Installation

```bash
# install server dependencies
cd server && npm install

# install client dependencies
cd ../client && npm install
```

### Installing prerequisites on macOS

If you use a Macbook M2 or another macOS computer with Homebrew, install Node.js and Redis as follows:
```bash
brew install node redis
brew services start redis
```
See [docs/MAC_INSTALL.md](docs/MAC_INSTALL.md) for a detailed walkthrough.


## Configuration

Create a `.env` file in `server/` with the following variables (the same file is also read by the React build):

```
OPENAI_API_KEY=YOUR_API_KEY
TEXT_LIMIT=1000
ALLOWED_ORIGIN=https://localhost:3001
PORT=3000
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
API_BASE_URL=https://localhost:3000
```

The server verifies that `OPENAI_API_KEY` is present at startup and exits with an error if it is missing.

The `TEXT_LIMIT` can be changed to control maximum allowed text length. Texts must be between **50** and `TEXT_LIMIT` characters. The rate limit is configured to 5 requests per minute per IP.

Self-signed TLS certificates are required and should be placed in the project **root** (not `server/`). If they are missing, generate new ones:

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout server.key -out server.crt -subj "/CN=localhost"
```

## Running the app

Start the API (HTTPS on port 3000):

```bash
cd server
npm run dev
```

Start the React client (HTTPS on port 3001):

```bash
cd ../client
npm start
```

Open <https://localhost:3001> in your browser. Accept the self‑signed certificates when prompted.

## Security and cost control

- All traffic uses HTTPS.
- Inputs are validated and sanitized server-side using `express-validator`.
- API requests are rate limited with `express-rate-limit`.
- OpenAI API key is kept server-side and never exposed to the client.
- CORS is restricted to the configured origin.
- Text length is limited by the `TEXT_LIMIT` environment variable.

## Troubleshooting

- **Server exits immediately**: ensure `server.crt` and `server.key` exist in the project root.
- **Status shows `error`**: verify that Redis is running and that `OPENAI_API_KEY` is set in `server/.env`.

## Documentation in Swedish

For a full guide in Swedish on how to run the app and what prerequisites are required, see [docs/INSTRUKTIONER.md](docs/INSTRUKTIONER.md).
