import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { SearchingProvider } from "@/context/SearchingContext";
import { UploadProvider } from "@/context/UploadContext";
import { SearchingModal } from "@/components/SearchingModal";
import { GlobalUploadModal } from "@/components/GlobalUploadModal";
import Layout from "@/components/layout/Layout"; // tu layout con Header
import type { Metadata } from "next";

export const metadata: Metadata = {
  icons: {
    icon: "/logo.jpg",
    shortcut: "/logo.jpg",
    apple: "/logo.jpg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen">
        <SearchingProvider>
          <AuthProvider>
            <UploadProvider>
              <SearchingModal />
              <Layout>{children}</Layout>
              <GlobalUploadModal />
            </UploadProvider>
          </AuthProvider>
        </SearchingProvider>
      </body>
    </html>
  );
}
