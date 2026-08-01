import { Metadata } from 'next';
import { getSiteConfig } from '@/lib/site-config';

export async function generateMetadata(): Promise<Metadata> {
  const { siteName } = getSiteConfig();
  return {
    title: 'แจ้งปัญหาการใช้งาน',
    description: `แจ้งปัญหาการใช้งานสินค้าหรือบริการ - ${siteName}`,
  };
}

export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
