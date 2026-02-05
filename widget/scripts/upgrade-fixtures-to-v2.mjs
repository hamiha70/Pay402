/**
 * Script to upgrade PTB fixtures from X-402 v1 to X-402 v2
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fixturesPath = path.join(__dirname, '../src/__fixtures__/ptb-fixtures.json');
const outputPath = path.join(__dirname, '../src/__fixtures__/ptb-fixtures.json');
const backupPath = path.join(__dirname, '../src/__fixtures__/ptb-fixtures.v1-backup.json');

function upgradeInvoiceToV2(invoice) {
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

function upgradeFixtures(fixtures) {
  console.log('\n🔄 Upgrading PTB fixtures to X-402 v2...\n');

  const keys = Object.keys(fixtures);
  const upgraded = {};

  for (const key of keys) {
    console.log(`Upgrading fixture: ${key}`);
    upgraded[key] = {
      ...fixtures[key],
      invoice: upgradeInvoiceToV2(fixtures[key].invoice),
    };
  }

  return upgraded;
}

async function main() {
  console.log('📦 PTB Fixtures Upgrade Script');
  console.log('================================\n');

  // Read original fixtures
  console.log('📖 Reading fixtures from:', fixturesPath);
  const fixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf-8'));

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
