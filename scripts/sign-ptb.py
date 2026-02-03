#!/usr/bin/env python3
"""
Convert PTB bytes array to base64 and sign with sui keytool
Usage: python3 sign-ptb.py <buyer_address>
Input: JSON array of PTB bytes on stdin
Output: Signature string on stdout
"""
import sys
import json
import base64
import subprocess

if len(sys.argv) != 2:
    print("Usage: sign-ptb.py <buyer_address>", file=sys.stderr)
    sys.exit(1)

buyer_address = sys.argv[1]

# Read PTB bytes from stdin (JSON array)
ptb_bytes = json.load(sys.stdin)

# Convert to binary
ptb_binary = bytes(ptb_bytes)

# Convert to base64
ptb_base64 = base64.b64encode(ptb_binary).decode('utf-8')

# Sign using sui keytool
result = subprocess.run(
    ['sui', 'keytool', 'sign', '--address', buyer_address, '--data', ptb_base64],
    capture_output=True,
    text=True
)

if result.returncode != 0:
    print(f"Signing failed: {result.stderr}", file=sys.stderr)
    sys.exit(1)

# Extract signature (first line that looks like a signature)
for line in result.stdout.strip().split('\n'):
    if len(line) > 100 and all(c in 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=' for c in line):
        print(line)
        sys.exit(0)

print("No signature found in output", file=sys.stderr)
sys.exit(1)
