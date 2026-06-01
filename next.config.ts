import type { NextConfig } from "next"

const nextConfig: NextConfig = {
    experimental: {
        optimizePackageImports: ["@remixicon/react", "radix-ui"],
    },
}

export default nextConfig
