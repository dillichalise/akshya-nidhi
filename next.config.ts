import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Native/heavy server-only packages stay out of the bundle.
  // Fonts are read from disk at runtime by the PDF route; make sure Vercel ships them.
  outputFileTracingIncludes: { "/api/reports/pdf": ["./assets/fonts/**"] },
  serverExternalPackages: ["@node-rs/argon2", "@react-pdf/renderer", "exceljs"],
};

export default withNextIntl(nextConfig);
