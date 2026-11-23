
import './App.css'

function App() {
  return (
    <div className="app">
      <aside className="sidebar">
        <h2 className="logo">NEON<span>CLIPPING</span></h2>

        <p className="menu-label">WORKSPACE</p>
        <nav>
          <a className="active">▦ Dashboard</a>
          <a>✂ Create Clips</a>
          <a>▤ My Library</a>
          <a>◷ Live Sessions</a>
        </nav>

        <div className="sidebar-bottom">
          <a>⚙ Settings</a>
          <a>ⓘ Help & Support</a>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">VIDEO WORKSPACE</p>
            <h1>Dashboard</h1>
          </div>
          <div className="profile">A</div>
        </header>

        <section className="welcome">
          <div>
            <p className="eyebrow">YOUR AI VIDEO STUDIO</p>
            <h2>Turn long videos into <span>viral clips.</span></h2>
            <p className="subtitle">
              Create, caption and export engaging short-form videos with AI.
            </p>
          </div>
          <div className="welcome-icon">✦</div>
        </section>

        <section className="stats">
          <div className="stat-card">
            <p>Total Projects</p>
            <h2>00</h2>
            <span>Your video projects</span>
          </div>
          <div className="stat-card">
            <p>Clips Created</p>
            <h2>00</h2>
            <span>AI-generated clips</span>
          </div>
          <div className="stat-card">
            <p>Live Sessions</p>
            <h2>00</h2>
            <span>Your streaming sessions</span>
          </div>
        </section>

        <section className="create-section">
          <div>
            <p className="eyebrow">GET STARTED</p>
            <h2>Create your first clip</h2>
            <p>Paste a video link or upload a video to begin.</p>
          </div>

          <div className="input-area">
            <input
              type="text"
              placeholder="Paste YouTube, Twitch or Kick URL..."
            />
            <button>Start Creating ↗</button>
          </div>
        </section>

        <section className="recent">
          <div>
            <h2>Recent Projects</h2>
            <p>Your latest video projects will appear here.</p>
          </div>
          <div className="empty-state">
            <div className="empty-icon">▧</div>
            <h3>No projects yet</h3>
            <p>Your created clips will appear here.</p>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
