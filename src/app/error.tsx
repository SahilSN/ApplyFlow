"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="fatal">
      <h1>Something went wrong</h1>
      <p>Your saved data is still in your local database.</p>
      <button onClick={reset}>Try again</button>
    </main>
  );
}
