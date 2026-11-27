import Link from "next/link";

const sampleRewards = [
  { name: "Grocery essentials voucher", category: "Everyday", points: "1,200 pts", stock: "Sample listing" },
  { name: "Home and kitchen bundle", category: "Home", points: "3,500 pts", stock: "Sample listing" },
  { name: "Mobile data bundle", category: "Digital", points: "650 pts", stock: "Sample listing" },
];

const steps = [
  ["01", "Discover", "Browse campaigns with clear eligibility and published terms."],
  ["02", "Earn", "Complete an eligible activity. Points are credited only after trusted verification."],
  ["03", "Redeem", "Choose a listed reward and see its exact cost and availability before confirming."],
];

export default function HomePage() {
  return (
    <main>
      <header className="topbar">
        <Link className="brand" href="/" aria-label="WheelofWinners home"><span className="brand-mark">W</span> WheelofWinners</Link>
        <nav aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#rewards">Rewards</a>
          <a className="nav-cta" href="#get-started">Get started</a>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow"><span className="dot" /> A clearer kind of rewards club</p>
          <h1>Good engagement.<br /><em>Real rewards.</em></h1>
          <p className="hero-text">Discover brand campaigns, earn points through eligible activities, and redeem them for rewards with clear prices and terms.</p>
          <div className="hero-actions">
            <a className="button button-primary" href="#rewards">Explore rewards <span aria-hidden="true">↗</span></a>
            <a className="text-link" href="#how-it-works">See how it works</a>
          </div>
          <p className="micro-note">No random draws. No paid entries. Just transparent rewards.</p>
        </div>
        <div className="hero-art" aria-label="Illustration of a gift box and reward cards">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="gift-card">
            <div className="gift-spark">✳</div>
            <div className="gift-box"><span /><i /></div>
            <p>YOUR NEXT<br /><strong>GOOD THING</strong></p>
            <small>Earn it. Choose it. Enjoy it.</small>
          </div>
          <div className="floating-tag tag-top">✦ Points with purpose</div>
          <div className="floating-tag tag-bottom">✓ Clear reward terms</div>
        </div>
      </section>

      <section className="trust-strip" aria-label="Platform principles">
        <span>Transparent point values</span><span>Verified activities</span><span>Guaranteed listed rewards</span><span>Vendor-backed fulfilment</span>
      </section>

      <section className="section how-section" id="how-it-works">
        <div className="section-heading"><p className="eyebrow">Simple by design</p><h2>Three steps. <em>No guesswork.</em></h2></div>
        <div className="steps-grid">
          {steps.map(([number, title, description]) => <article className="step" key={number}><span className="step-number">{number}</span><h3>{title}</h3><p>{description}</p></article>)}
        </div>
      </section>

      <section className="section rewards-section" id="rewards">
        <div className="section-heading reward-heading"><div><p className="eyebrow">A taste of what’s possible</p><h2>Rewards worth <em>working toward.</em></h2></div><span className="sample-label">Illustrative examples</span></div>
        <div className="reward-grid">
          {sampleRewards.map((reward, index) => <article className="reward-card" key={reward.name}>
            <div className={`reward-visual visual-${index + 1}`}><span>{["✳", "⌂", "◉"][index]}</span><small>{reward.category}</small></div>
            <div className="reward-info"><h3>{reward.name}</h3><div><strong>{reward.points}</strong><span>{reward.stock}</span></div></div>
          </article>)}
        </div>
        <p className="disclaimer">These are sample concepts, not live offers. No rewards, inventory, or point balances are currently connected.</p>
      </section>

      <section className="closing" id="get-started"><div><p className="eyebrow">Built around clarity</p><h2>Your points.<br /><em>Your choice.</em></h2><p>When the platform opens, every reward will show exactly what it costs and how it gets to you.</p></div><div className="closing-stamp">GOOD<br />THINGS<br /><span>ADD UP</span> ✳</div></section>

      <footer><Link className="brand" href="/"><span className="brand-mark">W</span> WheelofWinners</Link><span>Earn fairly. Redeem clearly.</span><span>© {new Date().getFullYear()} WheelofWinners</span></footer>
    </main>
  );
}
