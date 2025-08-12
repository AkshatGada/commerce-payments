import Link from 'next/link';

export default function Home() {
  return (
    <main>
      <h1>Commerce Payments Protocol – Demo</h1>
      <p>Run a single happy-path flow on Amoy using deployed contracts.</p>
      <ul>
        <li><Link href="/demo">Go to One-Click Demo</Link></li>
      </ul>
    </main>
  );
} 