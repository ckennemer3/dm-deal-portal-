import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'D&M Deal Portal',
  description: 'Internal deal submission and underwriting portal for D&M Auto Leasing',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
