import type { Metadata, Viewport } from "next"
import { Google_Sans_Code, Lora, DM_Sans } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"
import { GraphProvider } from "@/store/graph-provider"

const SITE_URL = "https://xml.manthaa.dev"
const SITE_NAME = "XML Visual Graph"
const SITE_DESCRIPTION =
    "Visualize XML, EDMX, XSD, and OData schemas as interactive entity-relationship graphs — entirely in the browser."

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: {
        default: SITE_NAME,
        template: `%s — ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    keywords: [
        "XML",
        "EDMX",
        "XSD",
        "OData",
        "schema visualization",
        "entity relationship",
        "graph",
    ],
    alternates: { canonical: "/" },
    openGraph: {
        type: "website",
        url: SITE_URL,
        siteName: SITE_NAME,
        title: SITE_NAME,
        description: SITE_DESCRIPTION,
    },
    twitter: {
        card: "summary",
        title: SITE_NAME,
        description: SITE_DESCRIPTION,
    },
}

export const viewport: Viewport = {
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#ffffff" },
        { media: "(prefers-color-scheme: dark)", color: "#1a1a17" },
    ],
}

const loraHeading = Lora({ subsets: ["latin"], variable: "--font-heading" })

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Google_Sans_Code({
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
