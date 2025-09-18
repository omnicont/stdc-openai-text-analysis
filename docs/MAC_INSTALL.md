# Installing on macOS (Apple Silicon)

These steps describe how to set up the prerequisites on a Macbook M2 or other Mac with Apple Silicon. They also work on Intel-based Macs with Homebrew installed.

1. **Install Homebrew** (if not already installed)
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
   Follow the printed instructions to add Homebrew to your PATH.

2. **Install Node.js and Redis**
   ```bash
   brew install node redis
   ```
   Start Redis with:
   ```bash
   brew services start redis
   ```

3. **Clone this repository and install dependencies**
   ```bash
   git clone <repository-url>
   cd stdc-openai-text-analysis-main
   cd server && npm install
   cd ../client && npm install
   ```

4. **Create the `.env` file and TLS certificates** (see the main README for details).

5. **Run the server and client**
   ```bash
   cd server && npm run dev
   cd ../client && npm start
   ```

Open `https://localhost:3001` in your browser to use the app.
