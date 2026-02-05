/**
 * Script to upgrade PTB fixtures from X-402 v1 to X-402 v2
 * 
 * This adds the required CAIP fields to existing fixture invoices:
 * - x402Version
 * - scheme
 * - network
 * - assetType
 * - payTo
 * - paymentId
 * - description
 * - maxAmountRequired
 * - maxTimeoutSeconds
 * - mimeType
 * - merchantAmount
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fixturesPath = path.join(__dirname, '../src/__fixtures__/ptb-fixtures.json');
const outputPath = path.join(__dirname, '../src/__fixtures__/ptb-fixtures.json');
const backupPath = path.join(__dirname, '../src/__fixtures__/ptb-fixtures.v1-backup.json');

interface Invoice {
  resource?: string;
  amount?: string;
  merchantRecipient?: string;
  facilitatorFee?: string;
  facilitatorRecipient?: string;
  coinType?: string;
  expiry?: number;
  nonce?: string;
  // X-402 v2 fields
  x402Version?: number;
  scheme?: string;
  network?: string;
  assetType?: string;
  payTo?: string;
  paymentId?: string;
  description?: string;
  maxAmountRequired?: string;
  maxTimeoutSeconds?: number;
  mimeType?: string;
  merchantAmount?: string;
}

interface Fixture {
  invoice: Invoice;
  invoiceJWT: string;
  buyerAddress: string;
  ptbBytes: number[];
  attackerRecipient?: string;
  actualAmount?: string;
}

interface Fixtures {
  validPayment: Fixture;
  wrongAmount: Fixture;
  wrongRecipient: Fixture;
  expiredInvoice: Fixture;
}

function upgradeInvoiceToV2(invoice: Invoice): Invoice {
  // If already has v2 fields, return as-is
  if (invoice.x402Version && invoice.network && invoice.assetType && invoice.payTo) {
    console.log('  ✅ Already has X-402 v2 fields, skipping');
    return invoice;
  }

  console.log('  📝 Adding X-402 v2 fields...');

  // Create upgraded invoice with both v1 (for backward compat) and v2 fields
  return {
    ...invoice,
    // X-402 v2 Standard Fields
    x402Version: 2,
    scheme: 'exact',
    network: 'sui:localnet',
    assetType: invoice.coinType 
      ? `sui:localnet/coin:${invoice.coinType}`
      : 'sui:localnet/coin:0x2::sui::SUI',
    payTo: invoice.merchantRecipient 
      ? `sui:localnet:${invoice.merchantRecipient}`
      : undefined,
    paymentId: invoice.nonce,
    description: 'Test payment for PTB verification',
    maxAmountRequired: invoice.amount,
    maxTimeoutSeconds: 3600,
    mimeType: 'application/json',
    merchantAmount: invoice.amount,
  };
}

function upgradeFixtures(fixtures: Fixtures): Fixtures {
  console.log('\n🔄 Upgrading PTB fixtures to X-402 v2...\n');

  return {
    validPayment: {
      ...fixtures.validPayment,
      invoice: upgradeInvoiceToV2(fixtures.validPayment.invoice),
    },
    wrongAmount: {
      ...fixtures.wrongAmount,
      invoice: upgradeInvoiceToV2(fixtures.wrongAmount.invoice),
    },
    wrongRecipient: {
      ...fixtures.wrongRecipient,
      invoice: upgradeInvoiceToV2(fixtures.wrongRecipient.invoice),
    },
    expiredInvoice: {
      ...fixtures.expiredInvoice,
      invoice: upgradeInvoiceToV2(fixtures.expiredInvoice.invoice),
    },
  };
}

async function main() {
  console.log('📦 PTB Fixtures Upgrade Script');
  console.log('================================\n');

  // Read original fixtures
  console.log('📖 Reading fixtures from:', fixturesPath);
  const fixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf-8')) as Fixtures;

  // Create backup
  console.log('💾 Creating backup at:', backupPath);
  fs.writeFileSync(backupPath, JSON.stringify(fixtures, null, 2));

  // Upgrade fixtures
  const upgraded = upgradeFixtures(fixtures);

  // Write upgraded fixtures
  console.log('\n💾 Writing upgraded fixtures to:', outputPath);
  fs.writeFileSync(outputPath, JSON.stringify(upgraded, null, 2));

  console.log('\n✅ Fixtures upgraded successfully!');
  console.log('📝 Backup saved at:', backupPath);
  console.log('\n🧪 Run tests to verify: npm test');
}

main().catch(console.error);
