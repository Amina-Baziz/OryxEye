import Toast from "../components/Toast";

const ROW1 = [
  "/images/602bdaaf55329_09886vjaime51__700.jpg",
  "/images/0974c39efd3c7ab0af7e7357c53e5ff7.jpg",
  "/images/2019_06_25_75103_1561445774._large.jpg",
  "/images/37476_shutterstock_2162688861.avif",
  "/images/700138b422fb6a43e211eb4e4bae3f87.jpg",
  "/images/a-colorful-beetle-sits-on-a-green-leaf-with-water-droplets-photo.jpg",
  "/images/bumble-bee-2361336_1920.jpg",
  "/images/closeup-macro-capture-ladybug-resting-260nw-2704727471.webp",
  "/images/cutest-cat-breeds-ragamuffin-663a8c5191d6e.avif",
  "/images/cutest-rabbit-breeds.webp",
  "/images/file-20250202-15-hczlk8.avif",
];

const ROW2 = [
  "/images/FullSizeR_41_480x480.webp",
  "/images/gettyimages-85120553.jpg",
  "/images/images (1).jpg",
  "/images/images (2).jpg",
  "/images/images.jpg",
  "/images/maxresdefault.jpg",
  "/images/pascal-muller-wFUyCqW9tS4-unsplash-2.webp",
  "/images/plumeria-for-sale.webp",
  "/images/queen-ant.avif",
  "/images/tearfund-footsteps-115-the-importance-of-insects-banner-image-1.webp",
  "/images/various-sedum_0-c45a220f449b42be9397b90db26d4ac7.jpg",
];

export default function LandingPage({ toast, setView }) {
  return (
    <div className="landing-root">
      <div className="blob blob-1" /><div className="blob blob-2" /><div className="blob blob-3" />
      <Toast message={toast.message} type={toast.type} />

      {/* TOP NAV */}
      <div className="landing-nav">
        <div className="topbar-logo"><span>🐾</span>ORYXEYE</div>
        <div className="landing-nav-btns">
          <button className="btn-nav-login" onClick={() => setView("login")}>Sign In</button>
          <button className="btn-nav-signup" onClick={() => setView("signup")}>Sign Up 🌿</button>
        </div>
      </div>

      {/* HERO */}
      <div className="landing-hero">
        <div className="floating-emojis">
          {["🦁","🌴","🦋","🐢","🌸","🦔","🐦","🌵","🐠","🦎","🌿","🐪"].map((e, i) => (
            <span key={i} className={"float-emoji fe-" + i}>{e}</span>
          ))}
        </div>
        <div className="hero-content">
          <div className="hero-badge">🇶🇦 Made for Qatar</div>
          <h1 className="hero-title">Discover Nature<br />Around You!</h1>
          <p className="hero-sub">Take photos, learn about animals and plants, play games and become a nature explorer!</p>
          <button className="btn-hero" onClick={() => setView("signup")}>Start Exploring 🚀</button>
        </div>
      </div>

      {/* SCROLLING PHOTO STRIPS */}
      <div className="photo-strips-container">
        <div className="photo-strip-wrapper">
          <div className="photo-strip scroll-left">
            {[...ROW1, ...ROW1].map((src, i) => (
              <div key={i} className="strip-photo"><img src={src} alt="nature" /></div>
            ))}
          </div>
        </div>
        <div className="photo-strip-wrapper">
          <div className="photo-strip scroll-right">
            {[...ROW2, ...ROW2].map((src, i) => (
              <div key={i} className="strip-photo"><img src={src} alt="nature" /></div>
            ))}
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <div className="landing-features">
        <div className="feature-card">
          <div className="feature-icon">📷</div>
          <h3>Identify Nature</h3>
          <p>Upload a photo of any animal, plant, or insect and learn all about it instantly!</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🤖</div>
          <h3>Ask Oryx</h3>
          <p>Chat with Oryx, your personal AI nature guide who answers any nature question!</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🌟</div>
          <h3>Daily Challenge</h3>
          <p>Learn about a new Gulf creature every day and test your knowledge with fun quizzes!</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🕵️</div>
          <h3>Guess the Nature</h3>
          <p>Get mysterious clues and guess what plant or animal is hiding!</p>
        </div>
      </div>

      {/* EMOJI STRIP */}
      <div className="animal-strip">
        {["🦌","🐦","🌴","🦋","🐢","🦔","🐠","🌸","🦎","🐪","🦭","🌵","🐝","🦜","🌊"].map((e, i) => (
          <span key={i} className="strip-emoji">{e}</span>
        ))}
      </div>

      {/* FOOTER CTA */}
      <div className="landing-cta">
        <h2>Ready to explore Qatar nature? 🌿</h2>
        <button className="btn-hero" onClick={() => setView("signup")}>Join ORYXEYE Free!</button>
      </div>
    </div>
  );
}