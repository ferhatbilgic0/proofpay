import { notFound } from 'next/navigation';
import { getContract } from '@/lib/store';
import { aiInfo } from '@/lib/ai';
import Masthead from '@/components/Masthead';
import AgreementView from '@/components/AgreementView';

export const dynamic = 'force-dynamic';

export default async function AgreementPage({ params }) {
  const { id } = await params;
  const contract = getContract(id);
  if (!contract) notFound();
  return (
    <>
      <div className="band band-slim">
        <div className="wrap">
          <Masthead aiLabel={aiInfo().label} />
        </div>
      </div>
      <main className="wrap">
        <AgreementView initial={contract} />
      </main>
    </>
  );
}
