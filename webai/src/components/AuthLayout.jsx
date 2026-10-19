function AuthLayout({ children, panelClassName = '', immersive = false }) {
  return (
    <main className={`login-layout ${immersive ? 'login-layout-explore' : ''}`}>
      <section className={`login-panel ${panelClassName}`}>{children}</section>
      <aside className="login-art" aria-label="Clinical workspace">
        <div className="art-quote">HEALTH DECISION SUPPORT SYSTEM</div>
      </aside>
    </main>
  )
}

export default AuthLayout