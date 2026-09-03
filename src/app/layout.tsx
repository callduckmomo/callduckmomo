import type { Metadata, Viewport } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import { Toaster } from "sonner";
import NavigationBar from "@/components/navigation-bar";
import HomePoster from "@/components/home-poster";
import AnnouncementBar from "@/components/announcement-bar";
import BottomNavigation from "@/components/bottom-navigation";
import AdminContactIcon from "@/components/admin-contact-icon";
import { PublicSettingsProvider } from "@/components/public-settings-provider";
import { ProductStockRealtimeProvider } from "@/components/products/product-stock-realtime-provider";
import { loadLayoutPublicSettings } from "@/lib/settings/load-layout-public-settings";
import { OrganizationJsonLd, WebSiteJsonLd } from "@/components/seo/json-ld";
import { DEFAULT_SITE_TITLE, getSiteConfig } from "@/lib/site-config";
import { checkTenantStatus } from "@/lib/api-master/tenant";
import { AlertTriangle } from "@/components/ui/icons";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-sans-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const { siteName: defaultSiteName, siteUrl } = getSiteConfig();
  const publicSettings = await loadLayoutPublicSettings();
  const siteTitle = publicSettings.site_title?.trim() || DEFAULT_SITE_TITLE;
  const shortTitle = siteTitle.split('|')[0].trim();

  const siteDescription = publicSettings.site_description || `${defaultSiteName} - ศูนย์รวมสินค้าและบริการพรีเมียมคุณภาพสูง`;

  const siteLogo = publicSettings.site_logo_url || undefined;
  // `site_logo_url` is mapped to a versioned database-media URL for uploaded
  // images. Referencing that same URL keeps the browser favicon in sync with
  // the navbar logo whenever the admin replaces the logo.
  const faviconUrl = siteLogo || "/logo.webp";

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: siteTitle,
      template: `%s | ${shortTitle}`,
    },
    description: siteDescription,
    icons: {
      icon: faviconUrl,
      shortcut: faviconUrl,
      apple: faviconUrl,
    },
  keywords: [
    // Main keywords
    defaultSiteName,
    "ขายแอพพรีเมียม",
    "เช่าแอพพรีเมียมราคาถูก",
    "บัญชีพรีเมียมแท้ ราคาถูก ปลอดภัย",
    "Premium App Service Thailand",
    // Secondary keywords
    "ขายบัญชีพรีเมียม",
    "เช่าบัญชีพรีเมียม",
    "แอปดูหนังพรีเมียม",
    "แอปเพลงพรีเมียม",
    "ขาย Netflix แท้",
    "Spotify Premium ราคาถูก",
    "YouTube Premium Family",
    "Disney+ Hotstar Premium",
    "Premium Account Thailand",
    "Shared Subscription",
    "บัญชีพรีเมียมไม่โดนแบน",
    "บัญชีแท้พร้อมรับประกัน",
    "เว็บขายแอพพรีเมียมถูกและปลอดภัย",
    // Long-tail keywords
    "ซื้อบัญชี Netflix Premium ราคาถูก",
    "วิธีเช่า Spotify Premium อย่างปลอดภัย",
    "แชร์บัญชี YouTube Premium",
    "Premium App Marketplace สำหรับคนไทย",
    "ซื้อแอพพรีเมียมราคาถูก ปลอดภัย พร้อมรับประกันหลังขาย",
    // Local & GEO keywords
    "ขายแอพพรีเมียมในไทย",
    "ร้านขายบัญชีพรีเมียมไทย",
    "เช่าแอพพรีเมียมราคาถูกที่สุดในไทย",
    "บริการคนไทย",
    // User requested & Extra related keywords
    "ขายnetflix",
    "ขายแอคnf",
    "netflix premium",
    "แอคพรี่เมี่ยม",
    "ราคาถูก",
    "รับตัวแทน",
    "แอคแท้ไม่มีจอปลิว",
    "หารเน็ตฟลิกรายเดือน",
    "สมัครnetflixราคาถูก",
    "สปอติฟายพรีเมี่ยม",
    "youtube premium ราคาถูก",
    "แอปพรีเมี่ยมแท้รับประกัน",
  ],
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: siteUrl,
    siteName: shortTitle,
    locale: "th_TH",
    type: "website",
    ...(siteLogo && {
      images: [
        {
          url: siteLogo,
          width: 1200,
          height: 630,
          alt: `${shortTitle} Premium App Service Thailand`,
        },
      ],
    }),
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    ...(siteLogo && {
      images: [siteLogo],
    }),
  },
  alternates: {
    canonical: siteUrl,
  },
  other: {
    'geo.region': 'TH',
    'geo.placename': 'Thailand',
    'geo.position': '13.7563;100.5018',
    'ICBM': '13.7563, 100.5018',
  },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: true,
  themeColor: "var(--theme-color)",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const publicSettings = await loadLayoutPublicSettings();
  const { siteId } = getSiteConfig();
  const { isSuspended } = await checkTenantStatus();

  return (
    <html lang="th" suppressHydrationWarning>
      <body 
        className={`${notoSansThai.variable} font-sans antialiased bg-[var(--theme-color-header-bg)]`}
        style={{ 
          '--theme-color': publicSettings.theme_color || process.env.NEXT_PUBLIC_THEME_COLOR || '#ff985c',
          '--theme-color-nav': publicSettings.theme_color_nav || '#e79940',
          '--theme-color-header-bg': publicSettings.theme_color_header_bg || '#ffffff',
          '--theme-color-bg-top': publicSettings.theme_color_bg_top || '#F5DDC2',
          '--theme-color-bg-bottom': publicSettings.theme_color_bg_bottom || '#F7C58D',
          '--theme-color-text-accent': publicSettings.theme_color_text_accent || '#D94654',
          '--theme-color-announcement': publicSettings.theme_color_announcement || '#ff985c',
          '--theme-color-text-main': publicSettings.theme_color_text_main || '#9a5832'
        } as React.CSSProperties}
      >
        <OrganizationJsonLd />
        <WebSiteJsonLd />
        <PublicSettingsProvider settings={publicSettings}>
        <ProductStockRealtimeProvider>
        
        {isSuspended ? (
          <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle size={40} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4 tracking-tight">เว็บไซต์ปิดปรับปรุงชั่วคราว</h1>
            <p className="text-lg text-gray-600 max-w-md mx-auto leading-relaxed">
              ขออภัยในความไม่สะดวก เว็บไซต์นี้ถูกระงับการใช้งานชั่วคราว กรุณาติดต่อผู้ให้บริการเพื่อดำเนินการต่อไป
            </p>
          </div>
        ) : (
          <>
            <NavigationBar />
            <HomePoster />
            <AnnouncementBar />
            {children}
            <BottomNavigation />
            <Toaster
              position="top-center"
              richColors
              expand
              closeButton
              duration={3000}
              className="font-sans"
              toastOptions={{
                style: { borderRadius: 12 },
                classNames: {
                  toast: "font-sans",
                  title: "font-sans",
                  description: "font-sans",
                  actionButton: "font-sans",
                  cancelButton: "font-sans",
                },
              }}
            />
          </>
        )}

        </ProductStockRealtimeProvider>
        </PublicSettingsProvider>
      </body>
    </html>
  );
}
