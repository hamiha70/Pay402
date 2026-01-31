import express, { Express } from 'express';
import { config } from './config.js';
import { healthController } from './controllers/health.js';
import { checkBalanceController } from './controllers/balance.js';
import { settlePaymentController } from './controllers/payment.js';

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
app.get('/health', healthController);
app.post('/check-balance', checkBalanceController);
app.post('/settle-payment', settlePaymentController);

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
