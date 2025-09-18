// 1. Import all necessary packages
require('dotenv').config();
const express = require('express');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const { body, validationResult } = require('express-validator');
const OpenAI = require('openai');
const Redis = require('ioredis');
const Bull = require('bull');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const https = require('https');
const fs = require('fs');
const path = require('path');

// 2. Setup DOMPurify for sanitizing input
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// 3. Make sure you are running Node v18 or higher
if (parseInt(process.versions.node.split('.')[0], 10) < 18) {
  console.error('Node 18+ is required');
  process.exit(1);
}

// 4. Check for required environment variables
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is missing in .env');
  process.exit(1);
}

const PORT = process.env.PORT || 3000;
const TEXT_LIMIT = parseInt(process.env.TEXT_LIMIT || '1000', 10);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://localhost:3001';

// 5. Setup Redis and Bull (queue)
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const redis = new Redis({ host: REDIS_HOST, port: REDIS_PORT });
redis.on('error', (err) => {
  console.error('Redis error:', err);
});
const workQueue = new Bull('analysis', { redis: { port: REDIS_PORT, host: REDIS_HOST } });

// 6. Configure OpenAI connection
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 7. Prompt for See-Think-Do-Care analysis
const systemPrompt =
  'You are a marketing expert analyzing text according to See-Think-Do-Care. Reply in Swedish. Provide short bullet points under each heading: See, Think, Do, and Care.';

// 8. Initialize the Express app
const app = express();
app.use(express.json());

// 9. Setup CORS (Cross-Origin Resource Sharing) BEFORE defining any routes
app.use(cors({ 
  origin: ALLOWED_ORIGIN, // Only allow requests from this frontend URL
  credentials: true       // Accept cookies/auth headers if needed
}));

// 10. Set up rate limiting for security and fairness
const analysisLimiter = rateLimit({ windowMs: 60 * 1000, max: 5 });
const statusLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 });

// 11. Schema for input validation and sanitization
const analyzeValidation = [
  body('text')
    .isString()
    .trim()
    .isLength({ min: 50, max: TEXT_LIMIT })
    .withMessage(`Text must be between 50 and ${TEXT_LIMIT} characters.`)
    .customSanitizer((value) => DOMPurify.sanitize(value)),
  body('model').isIn(['gpt-4', 'gpt-3.5-turbo']),
];

// 12. Route: POST /api/analysis - create a new analysis task
app.post('/api/analysis', analysisLimiter, analyzeValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }
    const { text, model } = req.body;
    const position = await workQueue.count();
    const job = await workQueue.add({ text, model });
    await redis.set(job.id, JSON.stringify({ status: 'pending' }), 'EX', 3600);
    const perJob = model === 'gpt-4' ? 1.2 : 0.8;
    const estimated = ((position + 1) * perJob).toFixed(1);
    res.json({ id: job.id, estimatedWait: `${estimated} sec` });
  } catch (err) {
    next(err);
  }
});

// 13. Route: GET /api/analysis/:id - check status/result of a submitted task
app.get('/api/analysis/:id', statusLimiter, async (req, res) => {
  const data = await redis.get(req.params.id);
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json(JSON.parse(data));
});

// 14. Route: DELETE /api/analysis/:id - cancel a task if needed
app.delete('/api/analysis/:id', analysisLimiter, async (req, res, next) => {
  try {
    const current = await redis.get(req.params.id);
    if (!current) {
      return res.status(404).json({ error: 'Not found' });
    }
    const parsed = JSON.parse(current);
    if (parsed.status === 'completed') {
      return res.json({ status: 'completed', message: 'Job already completed' });
    }
    if (parsed.status === 'cancelled') {
      return res.json({ status: 'cancelled' });
    }
    await workQueue.removeJobs(req.params.id);
    await redis.set(req.params.id, JSON.stringify({ status: 'cancelled' }), 'EX', 3600);
    res.json({ status: 'cancelled' });
  } catch (err) {
    next(err);
  }
});

// 15. Queue processor: actually run the analysis with OpenAI (runs in background)
workQueue.process(async (job) => {
  const { text, model } = job.data;
  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
    });
    if (!response.choices || !response.choices[0]) {
      throw new Error('Invalid response from OpenAI');
    }
    const analysis = response.choices[0].message.content;
    const status = await redis.get(job.id);
    if (status && JSON.parse(status).status === 'cancelled') return;
    await redis.set(job.id, JSON.stringify({ status: 'completed', analysis }), 'EX', 3600);
  } catch (err) {
    console.error('Job failed:', err.message);
    await redis.set(job.id, JSON.stringify({ status: 'error', message: err.message }), 'EX', 3600);
  }
});

// 16. Load and validate SSL certificates for HTTPS
const certPath = path.resolve(__dirname, '..');
const keyFile = path.join(certPath, 'server.key');
const certFile = path.join(certPath, 'server.crt');
if (!fs.existsSync(keyFile) || !fs.existsSync(certFile)) {
  console.error('Missing TLS certificates. Generate with:\n' +
    "openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout server.key -out server.crt -subj '/CN=localhost'");
  process.exit(1);
}
const options = {
  key: fs.readFileSync(keyFile),
  cert: fs.readFileSync(certFile),
};

// 17. Global error handler for the API
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// 18. Start the server via HTTPS
https.createServer(options, app).listen(PORT, () => {
  console.log(`Server running on https://localhost:${PORT}`);
});
