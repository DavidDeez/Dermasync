import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DermaSync | Intelligent Skincare Matcher',
  description: 'Discover if a product is truly safe for your unique skin profile using advanced AI and Computer Vision.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>
        <nav style={{ padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--surface-border)', background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 100 }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, background: 'linear-gradient(to right, var(--primary), var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            DermaSync
          </div>
          <div>
            <a href="/login" className="btn-primary" style={{ padding: '8px 20px', fontSize: '0.9rem' }}>Sign In</a>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
