import { Geist_Mono, Lora, DM_Sans } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"
import { GraphProvider } from "@/store/graph-provider"

const loraHeading = Lora({ subsets: ["latin"], variable: "--font-heading" })

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" })

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
            className={cn(
                "antialiased",
                fontMono.variable,
                "font-sans",
                dmSans.variable,
                loraHeading.variable
            )}
        >
            <body>
                <ThemeProvider>
                    <GraphProvider
                        fallback={
                            <main className="flex min-h-svh items-center justify-center p-6" />
                        }
                    >
                        {children}
                    </GraphProvider>
                    <Toaster />
                </ThemeProvider>
            </body>
        </html>
    )
}
