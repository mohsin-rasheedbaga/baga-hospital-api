import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BAGA Hospital API',
  description: 'BAGA Hospital Management System - API Backend',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
