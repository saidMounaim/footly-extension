function App() {
  return (
    <div className="flex min-h-[480px] flex-col">
      <header className="border-b border-border bg-surface px-4 py-3">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          Foot<span className="text-accent">ly</span>
        </h1>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-6">
        <p className="text-sm text-muted">Upcoming matches will appear here.</p>
      </main>
    </div>
  )
}

export default App
