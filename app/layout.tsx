import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DotMD — Score, Build & Optimize Your AI Context File',
  description:
    'Your .md file is your resume. Score it, build it from scratch, or optimize it with AI. Most people are leaving 70% of AI productivity on the table.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
        <body className="min-h-full bg-zinc-950 text-zinc-50 antialiased">{children}</body>
      </html>
    </ClerkProvider>
  )
}
