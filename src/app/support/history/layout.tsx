import { Metadata } from 'next';
import { getSiteConfig } from '@/lib/site-config';

export async function generateMetadata(): Promise<Metadata> {
  const { siteName } = getSiteConfig();
  return {
    title: 'ประวัติเคสแจ้งปัญหา',
    description: `ดูประวัติเคสแจ้งปัญหาทั้งหมดของคุณ - ${siteName}`,
    robots: { index: false, follow: false },
  };
}

export default function HistoryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
