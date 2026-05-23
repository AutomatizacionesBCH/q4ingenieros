import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Sidebar, SIDEBAR_W } from '@/components/Sidebar'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Q4 Ingenieros — Dashboard',
  description: 'Visualizador de proyectos de ingeniería vial',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body
        className="antialiased"
        style={{
          margin: 0,
          background: '#F0F2F6',
          minHeight: '100vh',
          display: 'flex',
        }}
      >
        <Sidebar />
        <main
          style={{
            marginLeft: SIDEBAR_W,
            flex: 1,
            minHeight: '100vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {children}
        </main>
      </body>
    </html>
  )
}
