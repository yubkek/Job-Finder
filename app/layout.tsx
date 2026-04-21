import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'JobFinder AU — Entry-level & Internships in Tech',
  description:
    'Aggregated entry-level, graduate, and internship tech jobs in Sydney and Melbourne, Australia.',
  keywords: ['graduate jobs', 'internships', 'software engineer', 'data analyst', 'Sydney', 'Melbourne', 'Australia'],
  openGraph: {
    title: 'JobFinder AU',
    description: 'Entry-level and internship tech jobs in Australia, aggregated in one place.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
