import type { Metadata } from 'next'
import './globals.css'
import '../styles/fonts.css'
import '../styles/index.css'
import '../styles/tailwind.css'
import '../styles/theme.css'
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'Aniporia',
  description: 'Know What You Don\'t Know',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body>{children}</body>
    </html>
  )
}