import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'เติมเงิน',
  robots: { index: false, follow: false },
};

export default function TopupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
