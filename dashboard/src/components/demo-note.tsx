export function DemoNote() {
  return (
    <aside className="rounded-lg border-2 border-kunyit bg-kunyit-soft/60 p-4 text-sm" aria-label="What is real and what is assumed">
      <p>
        <strong>What is real and what is assumed.</strong> The PIHPS reference prices (11 Nov 2026) and HET (government
        ceiling price) are official data, stored on-chain. The costs of the grosirs we run ourselves are{" "}
        <strong>assumptions</strong> (0.85 to 0.97 times HET), not real wholesale prices. tIDR is testnet test rupiah, not
        real money. Warungs named <span className="num">warung-NN</span> are seeded test accounts with fictional owner names;
        any other account is a real person using the app.
      </p>
    </aside>
  );
}
