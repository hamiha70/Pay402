#!/usr/bin/env node
/**
 * Sign PTB bytes using Suibase keychain
 * Usage: node sign-with-suibase.js <address> < ptb-bytes.json
 * Input: JSON array of bytes on stdin
 * Output: Signature on stdout
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const address = process.argv[2];
if (!address) {
  console.error('Usage: sign-with-suibase.js <address>');
  process.exit(1);
}

// Read PTB bytes from stdin
let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', async () => {
  try {
    const ptbBytes = JSON.parse(input);
    const ptbBinary = Buffer.from(ptbBytes);
    const ptbBase64 = ptbBinary.toString('base64');
    
    // Use sui keytool to sign
    const result = execSync(
      `sui keytool sign --address "${address}" --data "${ptbBase64}"`,
      { encoding: 'utf-8' }
    );
    
    // Extract signature (line with 130+ base64 chars)
    const lines = result.split('\n');
    for (const line of lines) {
      if (line.length > 100 && /^[A-Za-z0-9+/=]+$/.test(line.trim())) {
        console.log(line.trim());
        process.exit(0);
      }
    }
    
    console.error('No signature found in output:', result);
    process.exit(1);
    
  } catch (err) {
    console.error('Signing failed:', err.message);
    if (err.stderr) console.error('stderr:', err.stderr.toString());
    if (err.stdout) console.error('stdout:', err.stdout.toString());
    process.exit(1);
  }
});
