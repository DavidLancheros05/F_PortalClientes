import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { SearchingProvider } from "@/context/SearchingContext";
import { Notifications } from "@/components/Notifications";
import { SearchingModal } from "@/components/SearchingModal";
import Layout from "@/components/layout/Layout"; // tu layout con Header
import type { Metadata } from "next";

export const metadata: Metadata = {
  icons: {
    icon: "/logo.jpg",
    shortcut: "/logo.jpg",
    apple: "/logo.jpg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen">
        <SearchingProvider>
          <NotificationProvider>
            <AuthProvider>
              <SearchingModal />
              <Layout>{children}</Layout>
              <Notifications />
            </AuthProvider>
          </NotificationProvider>
        </SearchingProvider>
      </body>
    </html>
  );
}
