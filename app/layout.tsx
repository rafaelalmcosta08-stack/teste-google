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
  title: 'Polícia Aspect | Departamento de Polícia',
  description:
    'Departamento de Polícia Aspect - Servir e Proteger. Manual de Estudo TAFF, unidades e recrutamento.',
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
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable}`} style={{ backgroundColor: "#07090e" }}>
      <body className="font-sans antialiased" style={{ backgroundColor: "#07090e" }}>
        <AuthProvider>
          <SiteBackground />
          <PageTransition>{children}</PageTransition>
          <SiteFooter />
        </AuthProvider>
      </body>
    </html>
  )
}
