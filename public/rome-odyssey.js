(() => {
  if (location.pathname !== '/' && location.pathname !== '') return;
  const CA = '3PoPcQKmU9aXUoA6bk2xYkc6D3EfLUkCEabuEdLBpump';
  const short = (s) => `${s.slice(0, 6)}…${s.slice(-5)}`;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  document.title = 'ROME';
  document.body.innerHTML = `
    <div class="rome-site">
      <header class="rome-header">
        <a class="rome-wordmark" href="/" aria-label="ROME home">ROME</a>
        <nav class="rome-nav" aria-label="Primary navigation">
          <a href="#about">About</a><a href="#launchpad">Launchpad</a><a href="#markets">Markets</a><a href="#docs">Docs</a>
        </nav>
        <a class="rome-connect" href="/launch">Launch a coin <span>↗</span></a>
      </header>
      <main>
        <section class="rome-hero" id="about">
          <p class="rome-eyebrow">ROME · ECOSYSTEM LAUNCHPAD</p>
          <h1>Coins that<br><em>belong somewhere.</em></h1>
          <p class="rome-lede">ROME is a launchpad for tokens that share one ecosystem. Launch a coin, pair it to the ROME mint, and give every market a common place to begin.</p>
          <div class="rome-hero-actions"><a class="rome-button dark" href="/launch">Launch a coin <span>↗</span></a><a class="rome-text-link" href="#launchpad">Explore the system <span>↓</span></a></div>
          <div class="rome-simulation"><div class="rome-sim-top"><span>ROME / LIVE SYSTEM</span><span>SIMULATION 001</span></div><div class="rome-sim-stage"><div class="rome-orbit orbit-one"></div><div class="rome-orbit orbit-two"></div><div class="rome-sim-core"><img src="/rome-favicon.png" alt="ROME"/><b>ROME</b><small>ECOSYSTEM MINT</small></div><div class="rome-node node-a">NEW COIN <i></i></div><div class="rome-node node-b">LIQUIDITY <i></i></div><div class="rome-node node-c">MARKET <i></i></div></div><div class="rome-sim-bottom"><span>ONE FIXED PAIR</span><span>OPEN ACCESS</span><span>NON-CUSTODIAL</span></div></div>
        </section>
        <section class="rome-intro" id="launchpad"><div><p class="rome-eyebrow">THE LAUNCHPAD</p><h2>A shared market<br>for new ideas.</h2></div><p>Every ROME launch follows the same simple rule: one ecosystem pair, one transparent route, and no access gate. The interface stays quiet so the market can speak.</p></section>
        <section class="rome-models"><article><div class="rome-card-index">01 / LAUNCH</div><h3>Start a new<br>market.</h3><p>Create a token with your own name, ticker, description, and artwork. The wallet signs the exact transaction.</p><a href="/launch">Launch token <span>↗</span></a></article><article><div class="rome-card-index">02 / PAIR</div><h3>One ecosystem.<br>Many directions.</h3><p>Every token is prepared against the ROME ecosystem mint. No hidden routing. No IQ gate.</p><code>${short(CA)}</code></article><article id="markets"><div class="rome-card-index">03 / DISCOVER</div><h3>Markets in<br>real time.</h3><p>Exact-mint market data, activity, and token details stay connected to the live index.</p><a href="/markets">View markets <span>↗</span></a></article></section>
        <section class="rome-quote" id="docs"><p>“A launchpad should feel less like a form and more like opening a door.”</p><span>ROME PRINCIPLE / 001</span></section>
      </main>
      <footer class="rome-footer"><span>© ROME 2026</span><span>PAIR MINT · ${short(CA)}</span><span>BUILT FOR SOLANA ↗</span></footer>
    </div>`;
  document.querySelectorAll('.rome-site a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => { const target = document.querySelector(a.getAttribute('href')); if (target) { e.preventDefault(); target.scrollIntoView({behavior:'smooth'}); }}));
})();
