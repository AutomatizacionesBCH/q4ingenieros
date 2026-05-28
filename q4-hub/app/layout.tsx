import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

export const metadata: Metadata = {
  title: 'Q4 Hub — Gestión Financiera',
  description: 'Sistema de gestión Novarso / IDQ4',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="antialiased" style={{ margin: 0, minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  )
}
