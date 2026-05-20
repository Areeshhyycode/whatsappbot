import "./globals.css";

export const metadata = {
  title: "WhatsApp AI Bot Builder",
  description:
    "Build a WhatsApp bot from your own PDF/text documents, powered by Groq AI",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
