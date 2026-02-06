# zkLogin/Enoki Implementation Question for Dan (Sui DevRel)

## Issue Summary

We're implementing zkLogin using `@mysten/enoki@1.0.1` with the `registerEnokiWallets()` approach (as documented at https://docs.enoki.mystenlabs.com/ts-sdk/register). Configuration is complete (API keys, Google OAuth, allowed origins), wallet registration succeeds, but when users click "Sign in with Google," the SDK attempts to fetch `https://api.enoki.mystenlabs.com/v1/zklogin/nonce` which returns **HTTP 404**. We've verified this endpoint doesn't exist via `curl`.

## Our Setup

- Package: `@mysten/enoki@1.0.1` (latest), `@mysten/dapp-kit@1.0.1`
- Network: Testnet
- Config: Enoki public API key (zkLogin enabled), Google Client ID, localhost:5173 in allowed origins
- Behavior: `registerEnokiWallets()` succeeds, wallet shows in list, but OAuth flow fails on nonce request

## Question

Is the `/v1/zklogin/nonce` endpoint operational on testnet for `@mysten/enoki@1.0.1`, or should we use the deprecated `EnokiFlowProvider` approach (which works in v0.2.7 examples) until the new API is fully available? What's the recommended path forward for HackMoney hackathon timeline?
