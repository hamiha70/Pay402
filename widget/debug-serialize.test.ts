import { describe, it } from 'vitest';
import { Transaction } from '@mysten/sui/transactions';

describe('Debug tx.serialize()', () => {
  it('should show what serialize() returns', () => {
    const tx = new Transaction();
    const [coin] = tx.splitCoins(tx.gas, [100]);
    tx.transferObjects([coin], '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
    
    const serialized = tx.serialize();
    
    console.log('Type:', typeof serialized);
    console.log('Constructor:', serialized.constructor.name);
    console.log('Length:', serialized.length);
    console.log('First 20 chars:', serialized.substring(0, 20));
    console.log('Is valid base64?', /^[A-Za-z0-9+/=]+$/.test(serialized));
  });
});
