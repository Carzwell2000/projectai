function AuthLayout({ children }) {
  return (
    <main className="login-layout">
      <section className="login-panel">{children}</section>
      <aside className="login-art" aria-label="Clinical workspace">
        <div className="art-quote">HEALTH DECISION SUPPORT SYSTEM</div>
      </aside>
    </main>
  )
}

export default AuthLayout