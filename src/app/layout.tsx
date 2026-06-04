import type { Metadata } from "next";
import { Toaster } from "sonner";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";

export const metadata: Metadata = {
  title: "Accounting Dashboard",
  description: "Internal accounting work tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <NextTopLoader
          color="#10b981"
          height={2}
          shadow="0 0 8px #10b981"
          showSpinner={false}
        />
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#18181b",
              border: "1px solid #3f3f46",
              color: "#fafafa",
              fontSize: "13px",
            },
          }}
        />
      </body>
    </html>
  );
}
