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
import { extractSuiValues, parseCAIP2, parseCAIP19, parseCAIP10 } from './caip.js';

/**
 * Isomorphic atob polyfill (works in both browser and Node.js)
 * Browser: uses native atob()
 * Node.js: uses Buffer.from()
 */
const atobPolyfill = typeof atob !== 'undefined'
  ? atob
  : (str: string) => {
      if (typeof Buffer !== 'undefined') {
        return Buffer.from(str, 'base64').toString('binary');
      }
      throw new Error('No base64 decode available (missing atob and Buffer)');
    };

/**
 * Browser-compatible base64 to hex conversion
 * (Now isomorphic - works in both browser and Node.js)
 */
function base64ToHex(base64: string): string {
  const binary = atobPolyfill(base64);
  let hex = '';
  for (let i = 0; i < binary.length; i++) {
    const byte = binary.charCodeAt(i).toString(16).padStart(2, '0');
    hex += byte;
  }
  return hex;
}

/**
 * Isomorphic base64 to Uint8Array conversion
 * (Works in both browser and Node.js)
 */
function base64ToBytes(base64: string): Uint8Array {
  const binary = atobPolyfill(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Read little-endian u64 from Uint8Array
 */
function readU64LE(bytes: Uint8Array): bigint {
  if (bytes.length !== 8) {
    throw new Error(`Expected 8 bytes for u64, got ${bytes.length}`);
  }
  let value = 0n;
  for (let i = 0; i < 8; i++) {
    value |= BigInt(bytes[i]) << BigInt(i * 8);
  }
  return value;
}

/**
 * Invoice JWT structure (signed by merchant)
 */
export interface InvoiceJWT {
  // ===== X-402 V2 REQUIRED FIELDS (CAIP Standards) =====
  network: string;            // CAIP-2: "sui:mainnet" | "sui:testnet" | "sui:devnet"
  assetType: string;          // CAIP-19: "sui:mainnet/coin:0x2::usdc::USDC"
  payTo: string;              // CAIP-10: "sui:mainnet:0xMerchant..."
  paymentId: string;          // Unique payment identifier (same as nonce)
  description: string;        // Human-readable description
  
  // ===== EXISTING FIELDS (Backward Compatible) =====
  resource: string;           // e.g., "/api/premium-data"
  amount: string;             // In smallest unit (e.g., "100000" = 0.1 USDC)
  merchantRecipient: string;  // Merchant's SUI address (extracted from payTo)
  facilitatorFee: string;     // Facilitator's fee in smallest unit
  facilitatorRecipient: string; // Facilitator's address
  coinType: string;           // e.g., "0x2::usdc::USDC" (extracted from assetType)
  expiry: number;             // Unix timestamp
  nonce: string;              // Unique per invoice (same as paymentId)
  redirectUrl?: string;       // Optional: Where to redirect after payment
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
 * Compute invoice hash (SHA-256) - Browser-compatible
 * This will be emitted in the receipt event
 */
export async function computeInvoiceHash(invoiceJwt: string): Promise<string> {
  // Use Web Crypto API (available in browsers)
  const encoder = new TextEncoder();
  const data = encoder.encode(invoiceJwt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
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
export async function verifyPaymentPTB(
  ptbBytes: Uint8Array,
  invoice: InvoiceJWT,
  invoiceJwt: string
): Promise<VerificationResult> {
  try {
    // Parse and validate CAIP fields if present (X-402 V2)
    let effectiveCoinType = invoice.coinType;
    let effectiveMerchant = invoice.merchantRecipient;
    
    if (invoice.network && invoice.assetType && invoice.payTo) {
      try {
        const suiValues = extractSuiValues({
          network: invoice.network,
          assetType: invoice.assetType,
          payTo: invoice.payTo,
        });
        
        // Use CAIP-extracted values (overrides legacy fields)
        effectiveCoinType = suiValues.coinType;
        effectiveMerchant = suiValues.merchantAddress;
        
        // Validate consistency with legacy fields if both present
        if (invoice.coinType && invoice.coinType !== effectiveCoinType) {
          return {
            pass: false,
            reason: 'CAIP assetType conflicts with legacy coinType',
            details: {
              expectedAmount: effectiveCoinType,
              foundAmount: invoice.coinType,
            },
          };
        }
        
        if (invoice.merchantRecipient && invoice.merchantRecipient !== effectiveMerchant) {
          return {
            pass: false,
            reason: 'CAIP payTo conflicts with legacy merchantRecipient',
            details: {
              expectedRecipient: effectiveMerchant,
              foundRecipient: invoice.merchantRecipient,
            },
          };
        }
      } catch (caipErr) {
        return {
          pass: false,
          reason: 'Invalid CAIP fields in invoice',
          details: {
            expectedAmount: caipErr instanceof Error ? caipErr.message : String(caipErr),
          },
        };
      }
    }
    
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
          // Decode base64 address (browser-compatible)
          const hex = base64ToHex(input.Pure.bytes);
          return '0x' + hex;
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
          // Decode base64 to bytes (browser-compatible)
          const bytes = base64ToBytes(input.Pure.bytes);
          
          // Read as little-endian u64
          if (bytes.length === 8) {
            return readU64LE(bytes);
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

    // Extract MoveCall commands early (needed for multiple checks)
    const moveCalls = commands.filter((cmd: any) => cmd.$kind === 'MoveCall');
    
    // Verify coin type matches invoice (check MoveCall typeArguments)
    if (moveCalls.length > 0) {
      // Check if any MoveCall has typeArguments (should be settle_payment)
      for (const call of moveCalls) {
        const typeArgs = call.MoveCall?.typeArguments || [];
        if (typeArgs.length > 0) {
          // First type argument should match invoice coin type
          const ptbCoinType = typeArgs[0];
          if (ptbCoinType !== effectiveCoinType) {
            return {
              pass: false,
              reason: 'Coin type mismatch - PTB uses different token than invoice',
              details: {
                expectedAmount: effectiveCoinType,
                foundAmount: ptbCoinType,
              },
            };
          }
        }
      }
    }

    // Check if PTB uses settle_payment Move call (which handles transfers internally)
    const hasSettlePaymentCall = moveCalls.some((call: any) => {
      const moveCall = call.MoveCall;
      if (!moveCall) return false;
      
      // Check if it's calling settle_payment function in payment module
      return moveCall.module === 'payment' && moveCall.function === 'settle_payment';
    });

    // Find TransferObjects commands (only needed if NOT using settle_payment)
    const transfers = commands.filter(
      (cmd: any) => cmd.$kind === 'TransferObjects'
    );

    // If using settle_payment, skip transfer validation (Move function handles it)
    // Otherwise, require explicit transfers
    if (!hasSettlePaymentCall && transfers.length === 0) {
      return {
        pass: false,
        reason: 'No transfers found - PTB must transfer payment (or use settle_payment)',
      };
    }

    // If using settle_payment, validate MoveCall arguments instead of transfers
    if (hasSettlePaymentCall) {
      // Find the settle_payment call
      const settleCall = moveCalls.find((call: any) => {
        const moveCall = call.MoveCall;
        return moveCall && moveCall.module === 'payment' && moveCall.function === 'settle_payment';
      });

      if (settleCall) {
        // Validate settle_payment arguments match invoice
        // Arguments: [buyer_coin, buyer, amount, merchant, facilitator_fee, payment_id, clock]
        //
        // SECURITY MODEL:
        // - Verifier validates: amount, merchant, fee match invoice
        // - Move contract validates: ctx.sender() == buyer (prevents facilitator lying)
        // - Wallet validates: buyer must sign the PTB
        // 
        // We do NOT validate the buyer argument here because:
        // 1. Invoice doesn't contain buyer address (buyer unknown at invoice creation)
        // 2. Buyer address is provided by facilitator when building PTB
        // 3. Move contract will abort if ctx.sender() != buyer (line 100-101)
        // 4. Buyer must sign PTB, so ctx.sender() will be buyer's address
        //
        // This is SECURE because the Move contract enforces buyer == signer.
        const args = settleCall.MoveCall?.arguments || [];
        
        // Argument 1: buyer_coin (&mut Coin<T>)
        // Argument 2: buyer address (validated by Move: ctx.sender() == buyer)
        const buyerArg = args[1];
        // Argument 3: amount (validated by verifier)
        const amountArg = args[2];
        // Argument 4: merchant address (validated by verifier)
        const merchantArg = args[3];
        // Argument 5: facilitator fee (validated by verifier)
        const feeArg = args[4];
        // Argument 6: payment_id (not validated by verifier)
        // Argument 7: clock (system object)
        
        // Validate merchant address (argument 4)
        const merchantAddr = resolveAddress(merchantArg);
        if (merchantAddr && merchantAddr !== effectiveMerchant) {
          return {
            pass: false,
            reason: 'Merchant address mismatch in settle_payment call',
            details: {
              expectedRecipient: effectiveMerchant,
              foundRecipient: merchantAddr,
            },
          };
        }
        
        // Validate amount (argument 3)
        const amount = resolveAmount(amountArg);
        if (amount !== null && amount !== BigInt(invoice.amount)) {
          return {
            pass: false,
            reason: 'Amount mismatch in settle_payment call',
            details: {
              expectedAmount: invoice.amount,
              foundAmount: amount.toString(),
            },
          };
        }
        
        // Validate facilitator fee (argument 5)
        const fee = resolveAmount(feeArg);
        if (fee !== null && fee !== BigInt(invoice.facilitatorFee)) {
          return {
            pass: false,
            reason: 'Facilitator fee mismatch in settle_payment call',
            details: {
              expectedAmount: invoice.facilitatorFee,
              foundAmount: fee.toString(),
            },
          };
        }
      }
      
      // settle_payment handles payment transfers internally
      // Continue to check for EXTRA unauthorized transfers below
    }

    // Check for unauthorized transfers (applies to BOTH settle_payment and legacy paths)
    const transferRecipients = transfers.map((t: any) => {
      const addr = resolveAddress(t.TransferObjects?.address);
      return addr;
    }).filter(Boolean);

    if (!hasSettlePaymentCall) {
      // Legacy path: Validate explicit TransferObjects commands
      // Verify merchant payment transfer exists
      const hasMerchantTransfer = transferRecipients.some(
        addr => addr === effectiveMerchant
      );

      if (!hasMerchantTransfer) {
        return {
          pass: false,
          reason: 'Merchant payment transfer not found',
          details: {
            expectedRecipient: effectiveMerchant,
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
    }

    // Verify no unauthorized transfers (applies to BOTH paths)
    // When using settle_payment: only check for EXTRA transfers (not payment-related)
    // When not using settle_payment: check all transfers are authorized
    
    const authorizedRecipients = [
      effectiveMerchant,
      invoice.facilitatorRecipient,
    ].filter(Boolean);

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

    // Verify SplitCoins amounts (only for legacy path, not settle_payment)
    const splits = commands.filter(
      (cmd: any) => cmd.$kind === 'SplitCoins'
    );

    if (!hasSettlePaymentCall && splits.length === 0) {
      return {
        pass: false,
        reason: 'No coin splits found - PTB must split payment amount (or use settle_payment)',
      };
    }

    // Parse and verify split amounts (only for legacy path, not settle_payment)
    if (!hasSettlePaymentCall) {
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
      }
    }

    // Compute invoice hash for receipt verification
    const invoiceHash = await computeInvoiceHash(invoiceJwt);

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
          // Browser-compatible base64 to hex
          const hex = base64ToHex(input.Pure.bytes);
          return '0x' + hex;
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
