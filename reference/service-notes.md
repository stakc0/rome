# Loot native service boundaries

Implemented inventories preserve native app routes/interactions; no mock backend is implied.

## Early blockers and precise rewrites
- `index-CU_PDl1A.js`: `Wp()` + `Gp()` provide hardcoded Helius HTTP/WS URLs. `eP()` wires wallet provider. Replace both with owner read RPC; never copy the protected reference provider. Character offsets/excerpts are in services.json. No WS subscriptions were probed.
- `fg()` hardcodes a protected SolanaTracker project base. Replace price/chart/token-metadata gateway with owned source. `/chart/:mint` response key is literally `oclhv`.
- `B` contains LOOT programs, burn/credit addresses, LUT, mint, original host, upload and image services. `Eu()` signs a host-specific auth message; switch to owned host before enabling authentication. Never relay original session cookies.
- `cM()` POSTs image/metadata multipart to original upload origin. Block until owner upload exists.
- `HM()`/`UM()` perform launch signing; `KM()` POSTs Astralane sendBundle with an embedded provider credential. Strip/replace that credential, do not borrow it. `VM()` pays tip to original payee. Programs/payees must be explicitly reviewed, not silently retained as live write targets.
- Orders/unseal/refund, balances/transfer/cashout, deposit sign-in, admin whitelist/remove and all signed actions are owner-backend/write blockers. UI must stay recognizable while honest unavailable states explain what is not configured.

## Public GET gateway allowlist
Exact routes and bound query contracts are in services.json.publicGetPatterns. GET only, no arbitrary URL forwarding. Validate base58 mint/wallet, known brand IDs, nonnegative offset, bounded limit, known enum values; strip cookies/auth; reject all nonallowlisted methods/paths. Public user profiles contain public wallet-linked totals/credits: never merge with private balances or order data.

## Bounded verification
Ordinary unauthenticated Python requests performed GETs with no cookies or forged Origin/Referer. All public route samples returned JSON 200; /api/session returned 401. Response schemas, byte sizes, timestamp and small scalar samples are recorded. Dynamic counts are snapshots, not lifetime guarantees. Brand catalogue candidates differ from on-chain published registry and brands with coins. Native router has only /docs and /docs/developers; all eight subsections are anchors. Alias /cards and /cards/:brandId redirect to brands. Unknown routes redirect home. No standalone native holders endpoint or native trade API was found: payout recipients use /api/coins/:mint/payouts, and trading opens pump.fun.

Six native pages were rendered with Playwright networkidle; forms and readonly controls captured. Signed/upload/order actions were never activated. Documentation embedded sample snippets are not additional executable runtime routes.
