export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { saveContract } from '@/lib/store';
import { addEvent, ok, fail } from '@/lib/contracts';
import { loadMilestone } from '@/lib/milestoneRoute';
import { runReview } from '@/lib/runReview';

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_IMAGE_CHARS = 4_500_000; // about 3 MB of image data as base64

export async function POST(req, { params }) {
  const { contract, milestone, error } = await loadMilestone(params);
  if (error) return error;
  if (!['funded', 'delivered', 'reviewed'].includes(milestone.status)) {
    return fail('Deliveries open once the milestone is funded, and close once it is settled.');
  }
  const body = await req.json().catch(() => ({}));
  const text = String(body.text || '').trim().slice(0, 4000);
  const links = (Array.isArray(body.links) ? body.links : [])
    .map((l) => String(l).trim())
    .filter((l) => /^https?:\/\//i.test(l))
    .slice(0, 10);
  let image = null;
  if (body.image?.dataUrl) {
    const mime = body.image.dataUrl.slice(5, body.image.dataUrl.indexOf(';'));
    if (!IMAGE_TYPES.includes(mime)) return fail('Images must be PNG, JPEG or WebP.');
    if (body.image.dataUrl.length > MAX_IMAGE_CHARS) return fail('The image is larger than 3 MB.');
    image = { mime, dataUrl: body.image.dataUrl, name: String(body.image.name || 'image').slice(0, 80) };
  }
  if (!text && !links.length && !image) return fail('Add notes, a link or an image so the reviewer has something to check.');

  const revision = milestone.delivery ? (milestone.delivery.revision || 1) + 1 : 1;
  milestone.delivery = { text, links, image, revision, submittedAt: new Date().toISOString() };
  addEvent(contract, 'freelancer', `Submitted ${revision > 1 ? `revision ${revision}` : 'a delivery'} for "${milestone.title}".`);
  await runReview(contract, milestone);
  saveContract(contract);
  return ok({ contract });
}
