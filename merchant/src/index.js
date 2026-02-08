/**
 * Pay402 Demo Merchant - Premium Data API
 * 
 * Demonstrates HTTP 402 Payment Required pattern with Pay402
 * 
 * Endpoints:
 * - GET  /api/premium-data   → Returns 402 with invoice JWT
 * - GET  /api/verify-payment → Verifies payment and returns content
 * - GET  /health             → Health check
 * - GET  /                   → Demo page
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { healthController } from './controllers/health.js';
import { premiumDataController } from './controllers/premium-data.js';
import { verifyPaymentController } from './controllers/verify-payment.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors({
  origin: '*', // For demo - restrict in production
  credentials: true,
}));
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.get('/health', healthController);
app.get('/api/premium-data', premiumDataController);
app.get('/api/verify-payment', verifyPaymentController);

// Configuration endpoint for frontend
app.get('/api/config', (req, res) => {
  res.json({
    widgetUrl: process.env.WIDGET_URL || 'http://localhost:5173'
  });
});

// Demo page (served from public/index.html via static middleware)
// Fallback for old inline demo
app.get('/demo-old', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Pay402 Demo Merchant</title>
      <style>
        body {
          font-family: system-ui, -apple-system, sans-serif;
          max-width: 800px;
          margin: 50px auto;
          padding: 20px;
          background: #f5f5f5;
        }
        .card {
          background: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        h1 { margin-top: 0; }
        .price { font-size: 24px; font-weight: bold; color: #059669; }
        button {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-size: 16px;
          cursor: pointer;
          margin-top: 20px;
        }
        button:hover { background: #2563eb; }
        pre {
          background: #1f2937;
          color: #f3f4f6;
          padding: 15px;
          border-radius: 6px;
          overflow-x: auto;
        }
        .status {
          padding: 10px;
          margin: 10px 0;
          border-radius: 6px;
        }
        .error { background: #fee2e2; color: #991b1b; }
        .success { background: #d1fae5; color: #065f46; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>🔐 Premium Data API</h1>
        <p>Unlock exclusive market insights with Pay402!</p>
        <div class="price">0.1 USDC per request</div>
        
        <button onclick="getData()">Get Premium Data</button>
        
        <div id="status"></div>
        <div id="result"></div>
      </div>

      <script>
        async function getData() {
          const status = document.getElementById('status');
          const result = document.getElementById('result');
          
          status.innerHTML = '<div class="status">Requesting data...</div>';
          result.innerHTML = '';
          
          try {
            const response = await fetch('/api/premium-data');
            
            if (response.status === 402) {
              // Payment required!
              const data = await response.json();
              status.innerHTML = '<div class="status error">⚠️ Payment Required (HTTP 402)</div>';
              result.innerHTML = \`
                <h3>Invoice Received:</h3>
                <pre>\${JSON.stringify(data, null, 2)}</pre>
                <p><strong>Next Step:</strong> Open Pay402 payment page with this invoice JWT to complete payment.</p>
              \`;
            } else if (response.ok) {
              // This shouldn't happen without payment
              const data = await response.json();
              status.innerHTML = '<div class="status success">✅ Data Received</div>';
              result.innerHTML = \`<pre>\${JSON.stringify(data, null, 2)}</pre>\`;
            } else {
              throw new Error(\`HTTP \${response.status}\`);
            }
          } catch (error) {
            status.innerHTML = \`<div class="status error">❌ Error: \${error.message}</div>\`;
          }
        }
      </script>
    </body>
    </html>
  `);
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`
🏪 Pay402 Demo Merchant
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Status: Running
Port: ${PORT}
Network: ${config.suiNetwork}

Endpoints:
  GET  http://localhost:${PORT}/              - Demo page
  GET  http://localhost:${PORT}/health        - Health check
  GET  http://localhost:${PORT}/api/premium-data - Premium content (402)
  GET  http://localhost:${PORT}/api/verify-payment?paymentId=... - Verify & return

Configuration:
  Merchant: ${config.merchantName}
  Address: ${config.merchantAddress}
  Resource Price: ${config.resourcePrice} micro${config.coinType === '0x2::sui::SUI' ? 'SUI' : 'USDC'}
  Facilitator Fee: ${config.facilitatorFee}
  Invoice Expiry: ${config.invoiceExpirySeconds}s

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
});
