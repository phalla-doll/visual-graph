import { Geist, Geist_Mono, Lora, DM_Sans } from "next/font/google"

import "./globals.css"
import { StoreHydrator } from "@/components/store-hydrator"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils";

const loraHeading = Lora({subsets:['latin'],variable:'--font-heading'});

const dmSans = DM_Sans({subsets:['latin'],variable:'--font-sans'})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", dmSans.variable, loraHeading.variable)}
    >
      <body>
        <ThemeProvider>
          <StoreHydrator />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
