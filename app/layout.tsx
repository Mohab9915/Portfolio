import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://www.mohab.website'),
  title: 'Mohab Haedarea — AI & Software Engineer',
  description:
    'Portfolio of Mohab Haedarea, an AI and software engineer specializing in LLM engineering, RAG pipelines, multi-agent orchestration, and full-stack development.',
  openGraph: {
    title: 'Mohab Haedarea — AI & Software Engineer',
    description:
      'Portfolio of Mohab Haedarea, an AI and software engineer specializing in LLM engineering, RAG pipelines, multi-agent orchestration, and full-stack development.',
    url: 'https://www.mohab.website',
    siteName: 'Mohab Haedarea Portfolio',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Mohab Haedarea — AI & Software Engineer',
    description:
      'Portfolio of Mohab Haedarea, an AI and software engineer specializing in LLM engineering, RAG pipelines, multi-agent orchestration, and full-stack development.',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#161310',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} bg-background`}
    >
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
