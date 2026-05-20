/** @type {import('next').NextConfig} */
const nextConfig = {
  // These packages use Node.js APIs and should not be bundled by Next.
  serverExternalPackages: [
    "pdf-parse",
    "mongoose",
    "@huggingface/transformers",
  ],
};

export default nextConfig;
