import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { PageTransition } from '@/components/page-transition'
import { SiteFooter } from '@/components/site-footer'
import { AuthProvider } from '@/lib/auth-context'
import { SiteBackground } from '@/components/site-background'
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
  title: 'Nômade | Assistente Virtual do Departamento de Polícia',
  description:
    'Nômade - Assistente Virtual Operacional do Departamento de Polícia. Central de inteligência, procedimentos, fichas e manuais.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0a0a0a',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased">
        <AuthProvider>
          <SiteBackground />
          <PageTransition>{children}</PageTransition>
          <SiteFooter />
        </AuthProvider>
      </body>
    </html>
  )
}
