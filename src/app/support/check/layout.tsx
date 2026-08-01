import { Metadata } from 'next';
import { getSiteConfig } from '@/lib/site-config';

export async function generateMetadata(): Promise<Metadata> {
  const { siteName } = getSiteConfig();
  return {
    title: 'ตรวจสอบเคสแจ้งปัญหา',
    description: `ตรวจสอบสถานะเคสแจ้งปัญหาของคุณ - ${siteName}`,
  };
}

export default function CheckLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
