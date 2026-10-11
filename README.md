# ROME Launchpad

ROME is an Odyssey-inspired Solana launchpad built from the working launch/index/market shell in `/loot`, with the IQ gate removed. It prepares non-custodial Pump V2 launch transactions and refuses to fall back to SOL when the configured ecosystem quote mint is unavailable.

## Canonical pair

Every launch is configured for this Pump quote mint:

`58mVnPymLGzCZbvgJdPGRb3JCJ95RYjvfyJNETU1pump`

The backend resolves the mint through the official Pump SDK and passes the resolved `quoteMint`, `quoteTokenProgram`, and `pumpQuote` into `createV2Instruction`. If Pump does not recognize the mint as an eligible quote, the launch returns an explicit `409` instead of creating the wrong pair.

## Run

```sh
npm install
npm run build
npm test
npm start
```

The local server uses port `5174` by default.

## Runtime boundaries

- Launches use the existing non-custodial wallet signing flow from `/loot`.
- Metadata uploads go to Pump's public metadata endpoint.
- Solana transactions are prepared, simulated, wallet-signed, then confirmed server-side.
- Public market reads use exact-mint DexScreener/GeckoTerminal adapters.
- Supabase credentials remain server-only.
- No IQ challenge or IQ launch pass is required.

The supplied pair mint was checked against the current official Pump SDK and is not currently live/eligible on mainnet, so the launcher is intentionally blocked until Pump recognizes it. It will not silently substitute SOL or another quote mint.
