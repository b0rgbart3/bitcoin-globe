// frontend/src/AboutModal.tsx
import { useEffect, useRef } from "react";
import "./AboutModal.scss";

interface Props {
  onClose: () => void;
}

export function AboutModal({ onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  return (
    <div
      className="about-overlay"
      ref={overlayRef}
      onClick={handleOverlayClick}
    >
      <div
        className="about-panel"
        role="dialog"
        aria-modal="true"
        aria-label="About Synchronicity: A Bitcoin Visualization"
      >
        <div className="about-panel__header">
          <span className="about-panel__title">Synchronicity: A Bitcoin Visualization</span>
          <button
            className="about-panel__close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="about-panel__body">
          <p className="about-panel__lead">
            A real-time 3D visualization of the Bitcoin network — the physical
            machines that carry it, the transactions flowing between them, and
            the variable duration rateheartbeat of consensus (blocks being
            mined).
          </p>

          <p className="about-panel__lead">
            The driving principle is <em>honest encoding.</em> Where something
            can be measured — a node's location, a transaction's size, a feerate
            — that measurement drives the visual directly. Aesthetic choices
            fill the rest, shaped to make the network legible and the experience
            worth staying with. The balance tips toward the data wherever it
            can.
          </p>

          {/* ── Interaction ─────────────────────────────────────────── */}
          <h2 className="about-panel__section">Navigating the Globe</h2>

          <div className="about-panel__interaction-grid">
            <div className="about-panel__interaction-item">
              <span className="about-panel__interaction-key">Click + Drag</span>
              <span className="about-panel__interaction-desc">
                Rotate the globe freely in any direction
              </span>
            </div>
            <div className="about-panel__interaction-item">
              <span className="about-panel__interaction-key">
                Scroll / Pinch
              </span>
              <span className="about-panel__interaction-desc">
                Zoom in and out
              </span>
            </div>
          </div>

          {/* ── Layers ──────────────────────────────────────────────── */}
          <h2 className="about-panel__section">What You're Looking At</h2>

          <table className="about-panel__table">
            <tbody>
              <tr>
                <td className="about-panel__table-key">Node globe</td>
                <td>
                  Reachable Bitcoin nodes with a locatable IP — pale green
                  points at real lat/lng coordinates
                </td>
              </tr>
              <tr>
                <td className="about-panel__table-key">Unlocatable halo</td>
                <td>
                  Reachable nodes with no coordinates (Tor and similar) — pale
                  green points in a tumbling off-globe band
                </td>
              </tr>
              <tr>
                <td className="about-panel__table-key">Transaction stream</td>
                <td>
                  Each transaction as it enters the mempool — size from vsize,
                  colour from feerate
                </td>
              </tr>
              <tr>
                <td className="about-panel__table-key">Atmosphere</td>
                <td>
                  Aggregate mempool pressure — the Fresnel shell's brightness
                  scales with pending vBytes and intake rate
                </td>
              </tr>
              <tr>
                <td className="about-panel__table-key">Block heartbeat</td>
                <td>
                  A confirmed block — a cool teal flare across all nodes
                  followed by an expanding shockwave
                </td>
              </tr>
              <tr>
                <td className="about-panel__table-key">Sunlight</td>
                <td>
                  Real time of day — directional light positioned at the true
                  subsolar point via NOAA approximation
                </td>
              </tr>
              <tr>
                <td className="about-panel__table-key">Moon</td>
                <td>
                  The real Moon at its current position — phase from sunlight
                  geometry, size from exact proportion, position from the
                  sublunar point
                </td>
              </tr>
              <tr>
                <td className="about-panel__table-key">ISS</td>
                <td>
                  The International Space Station at true orbital altitude (408
                  km) and inclination (51.6°) — geometry exaggerated for
                  visibility; initial phase arbitrary (no live TLE)
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── Honest encoding ─────────────────────────────────────── */}
          <h2 className="about-panel__section">The Honest Encoding</h2>

          <p>
            These aren't stylistic choices. Each encoding decision is about what
            the data can and cannot truthfully say.
          </p>

          <h3 className="about-panel__subsection">
            Geography Exists for Machines, Not for Money
          </h3>
          <p>
            Bitcoin transactions have <em>no location</em>. A transaction is
            inputs, outputs, and scripts — there is no country, no city, no IP
            address anywhere in the blockchain. Visualizations that show
            transactions "lighting up around the globe" are showing decorative
            fiction.
          </p>
          <p>
            Nodes are different: they're physical machines with IP addresses
            that can be geolocated. So the globe is the network's <em>body</em>,
            and everything without a location lives off the globe by
            construction:
          </p>
          <ul className="about-panel__list">
            <li>
              <strong>Nodes</strong> — placed on the sphere at real coordinates.
            </li>
            <li>
              <strong>Unlocatable nodes</strong> — a band around the globe,
              uniformly random, tumbling on drifting axes. Any position on it is
              meaningless by design — the motion exists so no fixed frame can be
              read into it.
            </li>
            <li>
              <strong>Transactions</strong> — motes drifting in the abstract
              volume between globe and halo. Position carries no information.
            </li>
          </ul>

          <h3 className="about-panel__subsection">
            Size is vsize. Colour is Feerate. Value is Never Encoded.
          </h3>
          <p>
            A transaction moving 500 BTC and one moving 5,000 sats look{" "}
            <em>identical</em> if their vsize and feerate match. That's
            deliberate. A miner assembling a block runs a knapsack over feerate
            against the 4,000,000 weight-unit ceiling — the amount of money
            moved is not an input to that decision anywhere. So the two things
            that decide inclusion are the two things drawn:
          </p>
          <ul className="about-panel__list">
            <li>
              <strong>Size ← vsize</strong> — how much block space it consumes
              (driven by input/output count, not amount transferred)
            </li>
            <li>
              <strong>Colour ← feerate</strong> — what it pays per unit of that
              space
            </li>
          </ul>
          <p>
            A large, high-feerate mote is a big transaction paying well —
            typically a consolidation or an inscription — not necessarily a
            large-value transfer.
          </p>

          <h3 className="about-panel__subsection">
            Orbital Radius is Queue Position — and It Tracks the Live Market
          </h3>
          <p>
            The mempool isn't a queue you advance through by waiting; it's a{" "}
            <em>continuous auction</em>. Your feerate is fixed the moment you
            broadcast, but your <em>rank</em> isn't — higher-fee transactions
            keep arriving and jump ahead. So feerate maps directly to orbital
            radius:
          </p>
          <ul className="about-panel__list">
            <li>
              <strong>High feerate → inner orbit</strong>, tight against the
              atmosphere — next in line.
            </li>
            <li>
              <strong>Low feerate → outer orbit</strong>, drifting far out —
              waiting, possibly for a long time.
            </li>
          </ul>
          <p>
            Crucially, radius is normalized against the <em>live fee ladder</em>{" "}
            (minimum → fastest), not a fixed scale. Your feerate never changes,
            but your radius does — because your position in the auction moves as
            the market moves. A mote doesn't inch inward by being patient; it
            only moves in if the market comes <em>down to meet it</em>. During
            congestion the stratified shells hold; during a genuine lull the
            ladder compresses and previously-stranded transactions visibly draw
            inward as they become minable. On a calm night where nearly every
            transaction pays the floor rate, the cloud collapses to a single
            shell — which is the honest picture of a network where nobody needs
            to compete.
          </p>

          <h3 className="about-panel__subsection">
            Nothing Predicts a Block, Because Nothing Can
          </h3>
          <p>
            Mining is memoryless. Every hash is an independent lottery ticket —
            if nine minutes have passed since the last block, the expected wait
            for the next one is still ten minutes. No signal in fees, mempool
            depth, or hashrate indicates a block is <em>about to</em> happen.
          </p>
          <p>
            So there is <strong>no countdown and no crescendo</strong>. The
            atmosphere tracks congestion, which is uncorrelated with block
            timing. The telemetry shows time
            <em> since</em> the last block, never time until. The pulse arrives
            unannounced. That unpredictability isn't a gap in the visualization
            — it <em>is</em> the phenomenon.
          </p>

          <h3 className="about-panel__subsection">Weight, Not Megabytes</h3>
          <p>
            Block fullness is <code>weight / 4,000,000</code>, not size in MB.
            SegWit discounts witness data, so a block is full at 4M weight units
            regardless of whether that lands at 1.6 MB or 2.1 MB on disk.
          </p>

          <h3 className="about-panel__subsection">
            Motes Die When a Block Confirms Them, Not on a Timer
          </h3>
          <p>
            A transaction's real lifetime runs from mempool arrival to
            confirmation — an event, not a duration. Each block reports{" "}
            <code>feeRange[0]</code>, the lowest feerate it included. Miners
            fill blocks greedily by feerate, so every pending mote at or above
            that threshold flares and vanishes at the pulse. The low-fee
            stragglers keep drifting — because in reality, they are still
            waiting.
          </p>

          <h3 className="about-panel__subsection">
            The ISS Orbit is Real; the Position on It Is Not
          </h3>
          <p>
            The ISS orbit has an inclination of exactly 51.6° and a period of
            92.68 minutes — both real figures. The altitude (408 km) is also
            accurate to scale. The inclined orbit ring traces the correct band
            of latitudes the station actually sweeps (±51.6°), and it moves at
            the real angular rate.
          </p>
          <p>One thing is deliberately wrong:</p>
          <ul className="about-panel__list">
            <li>
              <strong>Position on orbit</strong> — without a live TLE feed there
              is no way to know the ISS's current angular position. The station
              starts at an arbitrary point on the ring each time the scene
              loads. The <em>shape and altitude</em> of the orbit are correct;
              only the station's location within it is invented.
            </li>
          </ul>
          <p>
            The ISS structure itself is exaggerated several hundred× in size —
            it is 109 m wide in reality, sub-pixel at true scale.
          </p>

          <h3 className="about-panel__subsection">
            The Moon Phase is Not Drawn — It Falls Out
          </h3>
          <p>
            The Moon is placed at the real sublunar point — the geographic
            coordinates directly beneath it — using{" "}
            <code>astronomy-engine</code> (NASA, DE405 accuracy) to compute its
            geocentric position and Greenwich Sidereal Time to convert that to a
            longitude. Position is recomputed every 30 seconds; the Moon moves
            ~0.018° in that window, well below any perceptible threshold.
          </p>
          <p>
            Phase is never computed or painted. The scene already has a
            directional light at the true subsolar point. When that light hits a
            sphere placed at the correct lunar position, the illuminated arc
            facing Earth is the crescent, gibbous, or full disk that matches
            tonight's sky. The shader doesn't know it's drawing a phase — it's
            just lighting a sphere.
          </p>
          <p>Two things are accurate and one is deliberately wrong:</p>
          <ul className="about-panel__list">
            <li>
              <strong>Direction</strong> — astronomically correct to the
              arcminute.
            </li>
            <li>
              <strong>Size</strong> — the Moon's radius is 0.2727× Earth's, and
              the scene uses that exact ratio.
            </li>
            <li>
              <strong>Distance</strong> — the true distance is ~60 Earth-radii,
              which puts the Moon far off-screen at this scene scale. The
              distance is compressed to keep both objects in the same view. The
              direction and phase are unaffected; only the distance is a lie.
            </li>
          </ul>

          {/* ── Blind spots ─────────────────────────────────────────── */}
          <h2 className="about-panel__section">
            What This Visualization Discloses About Itself
          </h2>
          <ul className="about-panel__list">
            <li>
              The transaction feed is a <strong>rolling window</strong>, not a
              firehose. During bursts, arrivals are missed — the{" "}
              <code>tx/s</code> stat labels itself <em>sampled</em> when it
              detects saturation.
            </li>
            <li>
              <code>feeRange[0]</code> is a good approximation, but CPFP and
              package relay mean a low-fee transaction can ride in on a high-fee
              child — some motes that should vanish at the pulse will linger
              slightly longer than their apparent feerate implies.
            </li>
            <li>
              The mote swarm holds a few thousand transactions against a real
              backlog that can exceed 250,000. It's a window on{" "}
              <strong>arrivals</strong>, never the whole mempool.
            </li>
            <li>
              <strong>Node opacity breathes</strong> on a slow ambient cycle —
              this is an aesthetic rhythm, not a signal from any data source.
            </li>
            <li>
              <strong>
                The atmosphere briefly dims after a block is confirmed
              </strong>{" "}
              — a visual punctuation mark, not a measurement of mempool state.
              Real mempool pressure resumes driving the brightness immediately
              after.
            </li>
          </ul>

          {/* ── What it teaches ─────────────────────────────────────── */}
          <h2 className="about-panel__section">What It Teaches</h2>
          <p>
            Watch it long enough and it argues with several things people
            believe about Bitcoin.
          </p>

          <p>
            <strong>Most of the network is invisible.</strong> Around 63% of
            reachable nodes are unlocatable — Tor, no coordinates. The halo
            isn't a footnote; it outnumbers everything on the globe. And that's
            only the <em>reachable</em> network: the majority of all nodes sit
            behind NAT, accept no incoming connections, and cannot be enumerated
            by anyone. The globe shows the observable minority of an observably
            larger whole.
          </p>

          <p>
            <strong>
              The visible part is a map of data centres, not of people.
            </strong>{" "}
            The dense clusters are Ashburn, Falkenstein, Amsterdam, Helsinki —
            where cheap hosting lives, not where Bitcoin enthusiasts do. Someone
            in Caracas running a node on a New Jersey droplet appears as a New
            Jersey node. The map systematically relocates operators to their
            servers.
          </p>

          <p>
            <strong>Nodes are not miners.</strong> Mining hashpower and node
            geography barely overlap. Countries famous for mining can show
            almost no nodes, because a miner points hashrate at a pool, and the
            pool's node lives in a data centre somewhere else entirely.
          </p>

          <p>
            <strong>There is no rhythm to find.</strong> The most valuable thing
            the piece can teach is that the pattern you're looking for doesn't
            exist. Quiet minutes yield nothing; busy minutes yield instant
            blocks; and vice versa. You learn memorylessness by watching it
            refuse to resolve.
          </p>

          <p className="about-panel__emphasis">
            None of these insights were designed in. They fell out of a rule —
            show only what the data actually says — and the network turned out
            to be more interesting than the marketing version.
          </p>

          {/* ── Inspirations ────────────────────────────────────────── */}
          <h2 className="about-panel__section">Inspirations</h2>
          <div className="about-panel__links">
            <a
              href="https://timechaincalendar.com/en"
              target="_blank"
              rel="noopener noreferrer"
              className="about-panel__link"
            >
              timechaincalendar.com
            </a>
            <a
              href="https://www.proofofsound.co.za/"
              target="_blank"
              rel="noopener noreferrer"
              className="about-panel__link"
            >
              proofofsound.co.za
            </a>
          </div>

          {/* ── About ───────────────────────────────────────────────── */}
          <h2 className="about-panel__section">About the Creator</h2>
          <p>
            Synchronicity: A Bitcoin Visualization was designed and built by <strong>Bart Dority</strong>{" "}
            — developer, designer, and independent researcher at the
            intersection of design, engineering, and data visualization systems.
          </p>
          <div className="about-panel__links">
            <a
              href="https://moon-math.online/"
              target="_blank"
              rel="noopener noreferrer"
              className="about-panel__link"
            >
              moon-math.online
            </a>
            <a
              href="https://bartdorityportfolio.online/"
              target="_blank"
              rel="noopener noreferrer"
              className="about-panel__link"
            >
              bartdorityportfolio.online
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
