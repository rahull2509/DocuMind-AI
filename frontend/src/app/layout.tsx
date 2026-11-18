import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DocuMind AI — Chat with your documents',
  description: 'A locally running AI-powered document intelligence platform with grounded RAG and local Ollama inference.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-white">
      <body className="h-full bg-white text-[#202123] antialiased">
        {children}
      </body>
    </html>
  );
}
