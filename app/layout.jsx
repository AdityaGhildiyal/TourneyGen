import "./globals.css"
import { Inter } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "TourneyGen — Smart Tournament Bracket Generator",
  description: "Create and manage tournament brackets with advanced algorithms, live scoring, and history archives",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>{/* Add any additional head elements here */}</head>
      <body className={inter.className}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}