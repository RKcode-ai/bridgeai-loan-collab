import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BridgeAI | Loan Calculator Collaboration',
  description: 'Hackathon-ready app that bridges business and engineering collaboration for a sample loan calculator repo.'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
