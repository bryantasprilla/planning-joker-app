export function SetupNeeded() {
  return (
    <main className="app narrow">
      <div className="panel stack">
        <p className="eyebrow">Setup needed</p>
        <h1 className="h2">Firebase isn't connected yet</h1>
        <p className="muted">
          Planning Joker keeps tables in Firestore. Copy <code>.env.example</code> to <code>.env.local</code> and fill in your
          Firebase web app config, or set <code>VITE_USE_EMULATORS=true</code> to run against the local emulators. The
          README walks through both.
        </p>
      </div>
    </main>
  );
}
