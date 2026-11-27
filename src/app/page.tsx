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

const wheelLabels = [
  ["DIGITAL", "wheel-label-digital"],
  ["EVERYDAY", "wheel-label-everyday"],
  ["HOME", "wheel-label-home"],
  ["LEARNING", "wheel-label-learning"],
  ["LIFESTYLE", "wheel-label-lifestyle"],
  ["EXPERIENCES", "wheel-label-experiences"],
];

export default function HomePage() {
  return (
    <main>
      <header className="topbar">
        <Link className="brand" href="/" aria-label="WheelofWinners home"><span className="brand-mark">W</span> WheelofWinners</Link>
        <nav aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <Link href="/rewards">Rewards</Link>
          <Link className="nav-cta" href="/auth">Sign in / Join</Link>
        </nav>
      </header>

      <section className="hero wheel-hero">
        <div className="hero-copy">
          <p className="eyebrow"><span className="dot" /> YOUR REWARD JOURNEY STARTS HERE</p>
          <h1>Find your next<br /><em>good thing.</em></h1>
          <p className="hero-text">Explore reward categories, complete eligible brand activities, earn verified points, and choose exactly what you want from the marketplace.</p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/rewards">Explore all rewards <span aria-hidden="true">↗</span></Link>
            <Link className="text-link" href="/auth">Create your account</Link>
          </div>
          <p className="micro-note">Every segment is a category, not a random prize. No paid entries or chance-based awards.</p>
        </div>
        <div className="wheel-stage">
          <div className="wheel-caption"><span className="wheel-caption-dot" /> THE REWARDS WHEEL</div>
          <div className="wheel-pointer" aria-hidden="true" />
          <div className="wheel-disk" role="img" aria-label="Six reward categories: Digital, Everyday, Home, Learning, Lifestyle and Experiences">
            {wheelLabels.map(([label, className]) => <span className={`wheel-label ${className}`} key={label}>{label}</span>)}
            <span className="wheel-center-decoration" aria-hidden="true">W</span>
          </div>
          <Link className="wheel-hub" href="/rewards" aria-label="Explore the rewards marketplace">
            <span>EXPLORE</span><strong>REWARDS</strong><small>Choose your path ↗</small>
          </Link>
          <div className="wheel-note wheel-note-top">✦ Six ways to explore</div>
          <div className="wheel-note wheel-note-bottom">✓ Clear terms. Real choices.</div>
        </div>
      </section>

      <section className="trust-strip" aria-label="Platform principles">
        <span>Transparent point values</span><span>Verified activities</span><span>Published reward terms</span><span>Vendor-backed fulfilment</span>
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

      <section className="closing" id="get-started"><div><p className="eyebrow">Built around clarity</p><h2>Your points.<br /><em>Your choice.</em></h2><p>Every reward will show exactly what it costs, whether it is available, and how it gets to you.</p><Link className="button button-primary auth-home-cta" href="/auth">Join the rewards club <span aria-hidden="true">↗</span></Link></div><div className="closing-stamp">GOOD<br />THINGS<br /><span>ADD UP</span> ✳</div></section>

      <footer><Link className="brand" href="/"><span className="brand-mark">W</span> WheelofWinners</Link><span>Earn fairly. Redeem clearly.</span><span>© {new Date().getFullYear()} WheelofWinners</span></footer>
    </main>
  );
}
