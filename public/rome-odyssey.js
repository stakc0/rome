(() => {
  const CA = '3PoPcQKmU9aXUoA6bk2xYkc6D3EfLUkCEabuEdLBpump';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const short = (s) => s ? `${s.slice(0, 6)}…${s.slice(-5)}` : '—';
  const money = (n) => { n = Number(n || 0); return n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(1)}K` : n ? `$${n.toFixed(2)}` : '—'; };
  let market = null, tokens = [];
  function nav(path = location.pathname) {
    const items = [['/', 'System'], ['/markets', 'Markets'], ['/launch', 'Launch'], ['/docs', 'Docs']];
    return `<nav class="rome-nav">${items.map(([href,label]) => `<a href="${href}" data-route class="${(href === '/' ? path === '/' : path.startsWith(href)) ? 'active' : ''}">${label}</a>`).join('')}<a href="https://x.com/romepadx" target="_blank" rel="noopener">@romepadx</a><a class="rome-launch-btn" href="/launch" data-route>Launch ↗</a></nav>`;
  }
  function shell(content) {
    document.title = 'ROME · Ecosystem Launchpad';
    document.body.innerHTML = `<div class="rome-app"><div class="rome-shell"><header class="rome-top"><a class="rome-brand" href="/" data-route><span class="rome-mark">R</span><span class="rome-word">ROME</span></a>${nav()} </header><main class="rome-page">${content}</main><footer class="footer"><span>ROME / ECOSYSTEM LAUNCHPAD</span><span>PAIR MINT ${short(CA)}</span><span>SOLANA SYSTEMS INTERFACE</span></footer></div></div>`;
    bind();
  }
  function bind() {
    document.querySelectorAll('[data-route]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); history.pushState({}, '', a.getAttribute('href')); render(); }));
  }
  async function loadMarket() {
    try { const j = await fetch(`/api/market/price?token=${CA}`, { cache: 'no-store' }).then(r => r.json()); market = j; updateMarketBits(); } catch {}
  }
  async function loadTokens() {
    try { const j = await fetch('/api/tokens', { cache: 'no-store' }).then(r => r.json()); tokens = j.tokens || j.rows || []; updateTokenGrid(); } catch { tokens = []; updateTokenGrid(); }
  }
  function updateMarketBits() {
    const map = { mc: money(market?.marketCap), vol: money(market?.volume24h), price: market?.price ? `$${Number(market.price).toPrecision(5)}` : '—', liq: money(market?.liquidity) };
    for (const [k,v] of Object.entries(map)) document.querySelectorAll(`[data-${k}]`).forEach(e => e.textContent = v);
  }
  function tokenCard(t) {
    const img = t.image || t.image_url || t.logo || '';
    const symbol = t.symbol || t.ticker || 'COIN';
    const name = t.name || symbol;
    const mint = t.mint || t.id || t.address || '';
    return `<a class="market-card" href="/token/${encodeURIComponent(mint)}" data-route><div class="coin-art">${img ? `<img src="${esc(img)}" alt="">` : `<span class="fallback">${esc(symbol.slice(0,3))}</span>`}</div><h3>${esc(symbol)}</h3><p class="meta">${esc(name)} · ${short(mint)}</p><div class="market-stats"><div>MC<b>${money(t.marketCapUsd || t.marketCap || t.mcap)}</b></div><div>24H VOL<b>${money(t.volume24hUsd || t.volume24h || t.volume)}</b></div></div></a>`;
  }
  function updateTokenGrid() {
    const grid = $('#marketGrid'); if (!grid) return;
    grid.innerHTML = tokens.length ? tokens.slice(0, 24).map(tokenCard).join('') : `<div class="empty">No indexed ROME launches yet. New markets will appear here as they are confirmed.</div>`;
  }
  function home() {
    shell(`<section class="hero-grid"><div><p class="eyebrow">ROME · ODYSSEY SYSTEM INTERFACE</p><h1>Launches that<br><em>orbit one mint.</em></h1><p class="lede">ROME is an ecosystem launchpad for coins that belong to the same market system. Every launch points back to the ROME pair, every market is indexed, and every route stays legible.</p><div class="actions"><a class="btn primary" href="/launch" data-route>Launch a coin ↗</a><a class="btn" href="/markets" data-route>View markets ↓</a></div></div><aside class="system-card"><div class="card-head"><span>LIVE SYSTEM</span><span>SIMULATION 001</span></div><div class="orbit"><div class="ring r1"></div><div class="ring r2"></div><div class="core"><div><b>ROME</b><span>ECOSYSTEM MINT</span></div></div><div class="node n1">NEW COIN <i></i></div><div class="node n2">LIQUIDITY <i></i></div><div class="node n3">MARKET <i></i></div></div></aside></section><section class="ticker"><div class="tick"><span>Market cap</span><b data-mc>—</b></div><div class="tick"><span>24h volume</span><b data-vol>—</b></div><div class="tick"><span>Price</span><b data-price>—</b></div><div class="tick"><span>Liquidity</span><b data-liq>—</b></div></section><section><div class="section-title"><h2>Market grid.</h2><p>Confirmed launches are shown as system cards: art, ticker, mint, market cap and volume. The page stays scannable even as the index fills.</p></div><div class="market-grid" id="marketGrid"><div class="empty">Syncing ROME markets…</div></div></section>`);
    loadMarket(); loadTokens();
  }
  function markets() {
    shell(`<section><p class="eyebrow">MARKET REGISTRY</p><h1>Indexed ROME<br><em>markets.</em></h1><p class="lede">Every card is a live launch indexed by exact mint. Built as a grid first, because markets should be browsed, compared, and scanned fast.</p></section><section><div class="section-title"><h2>All launches.</h2><p>Exact-mint directory for the ROME ecosystem.</p></div><div class="market-grid" id="marketGrid"><div class="empty">Syncing ROME markets…</div></div></section>`);
    loadTokens();
  }
  function launch() {
    shell(`<section><p class="eyebrow">LAUNCH ROUTE</p><h1>Create a market<br><em>inside ROME.</em></h1><p class="lede">A quiet, structured launch flow for new coins. Fill the details, connect wallet, and prepare the transaction against the ROME ecosystem route.</p></section><section class="form-grid"><form class="panel" id="romeLaunch"><label class="field">Coin name<input name="name" required maxlength="32" placeholder="Empire Coin"></label><label class="field">Ticker<input name="ticker" required maxlength="10" placeholder="ROME"></label><label class="field">Description<textarea name="description" rows="5" placeholder="What is this market about?"></textarea></label><label class="field">Artwork<input name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" required></label><button class="btn primary" type="submit">Prepare launch ↗</button><p class="notice" id="launchStatus">No transaction prepared. Wallet signs before anything is submitted.</p></form><aside class="panel"><p class="eyebrow">PAIR POLICY</p><h2 style="font-size:42px;line-height:.95;letter-spacing:-.075em;margin:18px 0">One ecosystem pair.</h2><p class="lede" style="font-size:17px">Every launch uses the ROME system mint as the reference route. This keeps the market index coherent and makes the whole ecosystem easier to follow.</p><div class="notice mono">PAIR MINT<br>${CA}</div></aside></section>`);
    $('#romeLaunch')?.addEventListener('submit', async e => {
      e.preventDefault(); const status = $('#launchStatus');
      try {
        const provider = window.phantom?.solana || window.solana;
        if (!provider) throw Error('Install Phantom or another Solana wallet first.');
        status.textContent = 'Connecting wallet…';
        const connected = await provider.connect();
        const wallet = String(connected.publicKey || provider.publicKey);
        const fd = new FormData(e.currentTarget); const file = fd.get('image');
        if (!(file instanceof File) || !file.size) throw Error('Choose token artwork.');
        const body = new FormData();
        body.set('file', file);
        body.set('launch', JSON.stringify({ wallet, name: String(fd.get('name') || '').trim(), symbol: String(fd.get('ticker') || '').trim().toUpperCase(), description: String(fd.get('description') || '').trim() }));
        status.textContent = 'Preparing ROME launch transaction…';
        const prepared = await fetch('/api/deploy', { method:'POST', body }).then(r => r.json());
        if (prepared.error) throw Error(prepared.error);
        status.textContent = 'Prepared. Review the transaction in wallet to continue.';
      } catch (err) { status.textContent = err.message || String(err); }
    });
  }
  function docs() {
    shell(`<section><p class="eyebrow">SYSTEM DOCS</p><h1>How ROME<br><em>routes launches.</em></h1><p class="lede">The interface is designed around a simple principle: a launchpad should be clear enough to trust at speed.</p></section><section class="doc-grid"><article class="doc"><p class="eyebrow">01 / Launch</p><h3>Create</h3><p>Token details, artwork, and wallet intent are gathered in a single direct flow. The creator signs the exact transaction.</p></article><article class="doc"><p class="eyebrow">02 / Pair</p><h3>Connect</h3><p>Every token is prepared against the ROME ecosystem mint so markets share a visible base layer.</p></article><article class="doc"><p class="eyebrow">03 / Index</p><h3>List</h3><p>Confirmed launches enter the market grid with exact mint data, live stats, and token pages.</p></article></section>`);
  }
  function profile() {
    shell(`<section><p class="eyebrow">PROFILE</p><h1>Wallet<br><em>console.</em></h1><p class="lede">Connect a Solana wallet to launch and manage ROME ecosystem markets.</p><div class="actions"><button class="btn primary" id="connectWallet">Connect wallet</button></div><p class="notice" id="walletStatus">Wallet not connected.</p></section>`);
    $('#connectWallet')?.addEventListener('click', async () => { const status = $('#walletStatus'); try { const p = window.phantom?.solana || window.solana; if (!p) throw Error('Install a Solana wallet first.'); const r = await p.connect(); status.textContent = `Wallet connected: ${short(String(r.publicKey || p.publicKey))}`; } catch (e) { status.textContent = e.message || String(e); } });
  }
  function tokenPage(mint) {
    shell(`<section><p class="eyebrow">TOKEN DIRECTORY</p><h1>Market<br><em>${short(mint)}.</em></h1><p class="lede">Exact-mint market page for the ROME ecosystem. Live market data appears once indexed.</p><div class="actions"><a class="btn primary" href="https://dexscreener.com/solana/${encodeURIComponent(mint)}" target="_blank" rel="noopener">Open DexScreener ↗</a><a class="btn" href="https://pump.fun/coin/${encodeURIComponent(mint)}" target="_blank" rel="noopener">Open Pump.fun ↗</a></div></section><section class="ticker"><div class="tick"><span>Mint</span><b class="mono" style="font-size:14px;word-break:break-all">${esc(mint)}</b></div><div class="tick"><span>Route</span><b>ROME</b></div><div class="tick"><span>Status</span><b>Indexed</b></div><div class="tick"><span>Pair</span><b>${short(CA)}</b></div></section>`);
  }
  function render() {
    const p = location.pathname.replace(/\/$/, '') || '/';
    if (p === '/') return home();
    if (p === '/markets' || p === '/brands' || p === '/cards') return markets();
    if (p === '/launch') return launch();
    if (p === '/docs' || p === '/docs/developers') return docs();
    if (p === '/profile') return profile();
    if (p.startsWith('/token/')) return tokenPage(decodeURIComponent(p.slice(7)));
    return home();
  }
  window.addEventListener('popstate', render);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render); else render();
})();
