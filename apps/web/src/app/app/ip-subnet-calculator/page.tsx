import { IpSubnetCalculatorLayout } from '@/components/ip-subnet-calculator/ip-subnet-calculator-layout';
import { generateToolMetadata } from '@/lib/metadata';

export const metadata = generateToolMetadata('ip-subnet-calculator');

export default function IpSubnetCalculatorPage() {
  return (
    <div className="h-full w-full min-h-0 p-2 md:p-4">
      <IpSubnetCalculatorLayout />
    </div>
  );
}
