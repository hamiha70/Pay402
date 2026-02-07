import express, { Express } from 'express';
import { config } from './config.js';
import { healthController } from './controllers/health.js';
import { checkBalanceController } from './controllers/balance.js';
import { settlePaymentController } from './controllers/payment.js';
import { buildPTBController } from './controllers/build-ptb.js';
import { submitPaymentController } from './controllers/submit-payment.js';
import { signPTBController } from './controllers/sign-ptb.js';
import { fundController } from './controllers/fund.js';

const app: Express = express();

// Middleware
app.use(express.json());

// CORS middleware (allow all origins for dev/hackathon)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({
    service: 'Pay402 Facilitator',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      'GET /health': 'Health check',
      'POST /check-balance': 'Check buyer USDC balance',
      'POST /build-ptb': 'Build unsigned PTB from invoice JWT',
      'POST /sign-ptb': '[DEV] Sign PTB with facilitator key (testing only)',
      'POST /submit-payment': 'Submit signed PTB (optimistic or pessimistic mode)',
      'POST /settle-payment': '[LEGACY] Direct settlement (bypasses buyer signature)',
      'POST /fund': 'Fund wallet with test USDC (dev only)',
    },
    docs: 'See facilitator/SETUP.md for API documentation',
  });
});

app.get('/health', healthController);
app.post('/check-balance', checkBalanceController);
app.post('/build-ptb', buildPTBController);
app.post('/sign-ptb', signPTBController);              // DEV: Sign PTB for testing
app.post('/submit-payment', submitPaymentController);  // NEW: Accepts signed PTB
app.post('/settle-payment', settlePaymentController);   // LEGACY: Direct settlement
app.post('/fund', fundController);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    details: err.message,
  });
});

// Start server
const PORT = config.port;

app.listen(PORT, () => {
  console.log(`
🚀 Pay402 Facilitator Backend
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  Status:    Running
  Port:      ${PORT}
  Network:   ${config.suiNetwork}
  
  Endpoints:
    GET  /health           - Health check
    POST /check-balance    - Check buyer balance
    POST /settle-payment   - Settle payment on-chain
    POST /fund             - Fund wallet (demo faucet)
    
  Environment:
    PACKAGE_ID:            ${config.packageId || '❌ Not set'}
    FACILITATOR_FEE:       ${config.facilitatorFee} microUSDC (${Number(config.facilitatorFee) / 1_000_000} USDC)
    FACILITATOR_KEY:       ${config.facilitatorPrivateKey ? '✅ Set' : '❌ Not set'}
    
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
  
  // Validate configuration
  if (!config.packageId) {
    console.warn('⚠️  WARNING: PACKAGE_ID not set in .env');
    console.warn('   Deploy Move contract first with: cd ../move/payment && sui client publish');
  }
  
  if (!config.facilitatorPrivateKey) {
    console.warn('⚠️  WARNING: FACILITATOR_PRIVATE_KEY not set in .env');
    console.warn('   Generate keypair with: sui client new-address ed25519');
  }
});

// Export app for Vercel serverless (keeps localhost working too)
export default app;
