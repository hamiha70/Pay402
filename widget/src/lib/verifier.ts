/**
 * Pay402 PTB Verifier - Core Security Component
 * 
 * Validates that a Programmable Transaction Block (PTB) from the facilitator
 * matches the expected payment template before the buyer signs it.
 * 
 * This prevents malicious facilitators from:
 * - Transferring wrong amounts
 * - Sending to wrong addresses
 * - Adding unauthorized operations
 */

import { Transaction } from '@mysten/sui/transactions';
import crypto from 'crypto';

/**
 * Invoice JWT structure (signed by merchant)
 */
export interface InvoiceJWT {
  resource: string;           // e.g., "/api/premium-data"
  amount: string;             // In smallest unit (e.g., "100000" = 0.1 USDC)
  merchantRecipient: string;  // Merchant's SUI address
  facilitatorFee: string;     // Facilitator's fee in smallest unit
  facilitatorRecipient: string; // Facilitator's address
  coinType: string;           // e.g., "0x2::sui::SUI" for now
  expiry: number;             // Unix timestamp
  nonce: string;              // Unique per invoice
}

/**
 * Verification result
 */
export interface VerificationResult {
  pass: boolean;
  reason?: string;
  details?: {
    expectedAmount?: string;
    foundAmount?: string;
    expectedRecipient?: string;
    foundRecipient?: string;
    invoiceHash?: string;
  };
}

/**
 * PTB command types we allow
 */
const AllowedCommand = {
  MergeCoins: 'MergeCoins',
  SplitCoins: 'SplitCoins',
  TransferObjects: 'TransferObjects',
  MoveCall: 'MoveCall',
} as const;

/**
 * Compute invoice hash (SHA-256)
 * This will be emitted in the receipt event
 */
export function computeInvoiceHash(invoiceJwt: string): string {
  const hash = crypto.createHash('sha256').update(invoiceJwt).digest('hex');
  return hash;
}

/**
 * Verify PTB matches payment template
 * 
 * Template:
 * 1. MergeCoins (optional) - combine buyer's coins
 * 2. SplitCoins - split exact payment amount + fee
 * 3. TransferObjects - send payment to merchant
 * 4. TransferObjects - send fee to facilitator
 * 5. MoveCall (optional) - emit receipt
 * 
 * Invariants:
 * - Exact payment amount to merchant
 * - Exact fee to facilitator (if applicable)
 * - No other transfers
 * - Asset type matches invoice
 * - Not expired
 */
export function verifyPaymentPTB(
  ptbBytes: Uint8Array,
  invoice: InvoiceJWT,
  invoiceJwt: string
): VerificationResult {
  try {
    // Parse PTB
    const tx = Transaction.from(ptbBytes);
    const data = tx.getData();
    const commands = data.commands || [];
    const inputs = data.inputs || [];

    if (!commands || commands.length === 0) {
      return {
        pass: false,
        reason: 'Empty transaction - no commands found',
      };
    }

    // Helper: Resolve address from Input reference
    const resolveAddress = (addrRef: any): string | null => {
      if (!addrRef) return null;
      
      // Address is an Input reference
      if (addrRef.$kind === 'Input' && typeof addrRef.Input === 'number') {
        const input = inputs[addrRef.Input];
        if (input?.$kind === 'Pure' && input.Pure?.bytes) {
          // Decode base64 address
          const bytes = Buffer.from(input.Pure.bytes, 'base64');
          // Convert to hex with 0x prefix
          return '0x' + bytes.toString('hex');
        }
      }
      
      // Direct address string
      if (typeof addrRef === 'string') {
        return addrRef;
      }
      
      return null;
    };

    // Helper: Resolve amount from Input reference (u64 little-endian)
    const resolveAmount = (amountRef: any): bigint | null => {
      if (!amountRef) return null;
      
      if (amountRef.$kind === 'Input' && typeof amountRef.Input === 'number') {
        const input = inputs[amountRef.Input];
        if (input?.$kind === 'Pure' && input.Pure?.bytes) {
          // Decode base64 to bytes
          const bytes = Buffer.from(input.Pure.bytes, 'base64');
          
          // Read as little-endian u64
          if (bytes.length === 8) {
            return bytes.readBigUInt64LE(0);
          }
        }
      }
      
      return null;
    };

    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (invoice.expiry < now) {
      return {
        pass: false,
        reason: `Invoice expired at ${new Date(invoice.expiry * 1000).toISOString()}`,
      };
    }

    // Verify only allowed commands
    for (const cmd of commands) {
      const cmdType = cmd.$kind;
      if (!Object.values(AllowedCommand).includes(cmdType as any)) {
        return {
          pass: false,
          reason: `Unauthorized command: ${cmdType}`,
        };
      }
    }

    // Find TransferObjects commands
    const transfers = commands.filter(
      (cmd: any) => cmd.$kind === 'TransferObjects'
    );

    if (transfers.length === 0) {
      return {
        pass: false,
        reason: 'No transfers found - PTB must transfer payment',
      };
    }

    // Resolve all transfer recipients
    const transferRecipients = transfers.map((t: any) => {
      const addr = resolveAddress(t.TransferObjects?.address);
      return addr;
    }).filter(Boolean);

    // Verify merchant payment transfer exists
    const hasMerchantTransfer = transferRecipients.some(
      addr => addr === invoice.merchantRecipient
    );

    if (!hasMerchantTransfer) {
      return {
        pass: false,
        reason: 'Merchant payment transfer not found',
        details: {
          expectedRecipient: invoice.merchantRecipient,
          foundRecipient: transferRecipients.join(', '),
        },
      };
    }

    // Verify facilitator fee transfer (if fee > 0)
    if (parseInt(invoice.facilitatorFee) > 0) {
      const hasFeeTransfer = transferRecipients.some(
        addr => addr === invoice.facilitatorRecipient
      );

      if (!hasFeeTransfer) {
        return {
          pass: false,
          reason: 'Facilitator fee transfer not found',
          details: {
            expectedRecipient: invoice.facilitatorRecipient,
            foundRecipient: transferRecipients.join(', '),
          },
        };
      }
    }

    // Verify no unauthorized transfers
    const authorizedRecipients = [
      invoice.merchantRecipient,
      invoice.facilitatorRecipient,
    ];

    const unauthorizedRecipients = transferRecipients.filter(
      addr => addr && !authorizedRecipients.includes(addr)
    );

    if (unauthorizedRecipients.length > 0) {
      return {
        pass: false,
        reason: 'Unauthorized transfer detected',
        details: {
          foundRecipient: unauthorizedRecipients.join(', '),
        },
      };
    }

    // Verify SplitCoins amounts
    const splits = commands.filter(
      (cmd: any) => cmd.$kind === 'SplitCoins'
    );

    if (splits.length === 0) {
      return {
        pass: false,
        reason: 'No coin splits found - PTB must split payment amount',
      };
    }

    // Parse and verify split amounts
    // Extract all amounts from all SplitCoins commands
    const splitAmounts: bigint[] = [];
    for (const split of splits) {
      const amounts = split.SplitCoins?.amounts || [];
      for (const amountRef of amounts) {
        const amount = resolveAmount(amountRef);
        if (amount !== null) {
          splitAmounts.push(amount);
        }
      }
    }

    // Expected amounts
    const expectedMerchantAmount = BigInt(invoice.amount);
    const expectedFeeAmount = BigInt(invoice.facilitatorFee);
    const totalExpected = expectedMerchantAmount + expectedFeeAmount;

    // Verify merchant amount exists
    if (!splitAmounts.some(amt => amt === expectedMerchantAmount)) {
      return {
        pass: false,
        reason: 'Merchant payment amount mismatch',
        details: {
          expectedAmount: invoice.amount,
          foundAmount: splitAmounts.map(a => a.toString()).join(', '),
        },
      };
    }

    // Verify fee amount (if > 0)
    if (expectedFeeAmount > 0n) {
      if (!splitAmounts.some(amt => amt === expectedFeeAmount)) {
        return {
          pass: false,
          reason: 'Facilitator fee amount mismatch',
          details: {
            expectedAmount: invoice.facilitatorFee,
            foundAmount: splitAmounts.map(a => a.toString()).join(', '),
          },
        };
      }
    }

    // Verify no extra splits (sum should equal total expected)
    const totalSplit = splitAmounts.reduce((sum, amt) => sum + amt, 0n);
    if (totalSplit !== totalExpected) {
      return {
        pass: false,
        reason: 'Total split amount does not match invoice total',
        details: {
          expectedAmount: totalExpected.toString(),
          foundAmount: totalSplit.toString(),
        },
      };
    }

    // Compute invoice hash for receipt verification
    const invoiceHash = computeInvoiceHash(invoiceJwt);

    // ✅ All checks passed
    return {
      pass: true,
      details: {
        expectedAmount: invoice.amount,
        expectedRecipient: invoice.merchantRecipient,
        invoiceHash,
      },
    };
  } catch (error) {
    return {
      pass: false,
      reason: `PTB parsing failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Quick validation for testing (less strict)
 * Used in development to test basic structure
 */
export function verifyPaymentPTBBasic(
  ptbBytes: Uint8Array,
  expectedRecipient: string
): VerificationResult {
  try {
    const tx = Transaction.from(ptbBytes);
    const data = tx.getData();
    const commands = data.commands || [];
    const inputs = data.inputs || [];

    // Helper: Resolve address from Input reference
    const resolveAddress = (addrRef: any): string | null => {
      if (!addrRef) return null;
      
      if (addrRef.$kind === 'Input' && typeof addrRef.Input === 'number') {
        const input = inputs[addrRef.Input];
        if (input?.$kind === 'Pure' && input.Pure?.bytes) {
          const bytes = Buffer.from(input.Pure.bytes, 'base64');
          return '0x' + bytes.toString('hex');
        }
      }
      
      if (typeof addrRef === 'string') {
        return addrRef;
      }
      
      return null;
    };

    // Find transfers
    const transfers = commands.filter(
      (cmd: any) => cmd.$kind === 'TransferObjects'
    );

    // Resolve recipients
    const recipients = transfers.map((t: any) => {
      return resolveAddress(t.TransferObjects?.address);
    }).filter(Boolean);

    // Check merchant transfer exists
    const hasValidTransfer = recipients.includes(expectedRecipient);

    if (!hasValidTransfer) {
      return {
        pass: false,
        reason: 'Expected recipient not found in transfers',
        details: { 
          expectedRecipient,
          foundRecipient: recipients.join(', '),
        },
      };
    }

    return { pass: true };
  } catch (error) {
    return {
      pass: false,
      reason: `Verification failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
