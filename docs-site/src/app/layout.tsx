import { RootProvider } from "fumadocs-ui/provider/next";
import type { Metadata } from "next";
import "./global.css";
import { Inter } from "next/font/google";
import SearchDialog from "@/components/search";
import { appDescription, appName, assetPath, basePath } from "@/lib/shared";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(`https://blacksujit.github.io${basePath}`),
  title: {
    default: `${appName} — AI Risk Monitoring for Production LLMs`,
    template: `%s — ${appName}`,
  },
  description: appDescription,
  icons: {
    icon: assetPath("/mark.svg"),
  },
  openGraph: {
    title: `${appName} — AI Risk Monitoring for Production LLMs`,
    description: appDescription,
    images: ["/product.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: `${appName} — AI Risk Monitoring for Production LLMs`,
    description: appDescription,
    images: ["/product.png"],
  },
};

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider search={{ SearchDialog }}>{children}</RootProvider>
      </body>
    </html>
  );
}
