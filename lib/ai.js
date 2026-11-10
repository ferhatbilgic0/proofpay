// Provider-agnostic AI layer. Set AI_PROVIDER to gemini, anthropic or mock.
// Both real providers are called over plain REST so there are no extra SDK dependencies.

export function aiProvider() {
  const explicit = (process.env.AI_PROVIDER || '').toLowerCase();
  if (explicit) return explicit;
  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  return 'mock';
}

export function aiInfo() {
  const p = aiProvider();
  const label = { gemini: 'Gemini', anthropic: 'Claude', mock: 'Mock (no API key)' }[p] || p;
  return { provider: p, label };
}

async function callGemini({ system, prompt, image }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is missing in .env');
  // Primary model first, then a lighter fallback if the primary is overloaded or slow.
  const models = [
    process.env.GEMINI_MODEL || 'gemini-3.5-flash',
    process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.5-flash-lite',
  ].filter((m, i, all) => m && all.indexOf(m) === i);
  const timeoutMs = Number(process.env.GEMINI_TIMEOUT_MS) || 45000;
  const parts = [{ text: prompt }];
  if (image) parts.push({ inline_data: { mime_type: image.mime, data: image.base64 } });
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingLevel: process.env.GEMINI_THINKING_LEVEL || 'low' },
    },
  });

  let lastError;
  for (const model of models) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) {
        lastError = new Error(`Gemini (${model}) returned ${res.status}: ${(await res.text()).slice(0, 300)}`);
        // Overload, rate limit or unknown model: try the next one. Anything else is a real error.
        if ([404, 429, 500, 503].includes(res.status)) continue;
        throw lastError;
      }
      const data = await res.json();
      const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
      if (text) return text;
      lastError = new Error(`Gemini (${model}) returned an empty answer.`);
    } catch (e) {
      if (e === lastError) throw e;
      lastError = e.name === 'TimeoutError' ? new Error(`Gemini (${model}) did not answer within ${timeoutMs / 1000}s.`) : e;
    }
  }
  throw lastError;
}

async function callAnthropic({ system, prompt, image }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is missing in .env');
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
  const content = [];
  if (image) content.push({ type: 'image', source: { type: 'base64', media_type: image.mime, data: image.base64 } });
  content.push({ type: 'text', text: `${prompt}\n\nRespond with the JSON object only.` });
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens: 2000, system, messages: [{ role: 'user', content }] }),
  });
  if (!res.ok) throw new Error(`Claude returned ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
}

function parseJson(text) {
  const cleaned = text.replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('The AI response did not contain JSON.');
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function complete(args) {
  const p = aiProvider();
  if (p === 'gemini') return parseJson(await callGemini(args));
  if (p === 'anthropic') return parseJson(await callAnthropic(args));
  throw new Error(`Unknown AI_PROVIDER "${p}"`);
}

// ---------- Contract drafting ----------

const DRAFT_SYSTEM = `You are the contract agent inside ProofPay, an escrow tool for freelancers and their clients.
You turn an informal job brief into milestones whose acceptance criteria can be checked objectively from what the freelancer hands over.
Each criterion must name something observable: a file or format, a count, a size, a link, a visible feature, a passing check.
Never use vague words such as high quality, professional, modern, clean or nice.
Write in the same language as the brief. Return only JSON.`;

export async function draftContract(brief, { budget } = {}) {
  if (aiProvider() === 'mock') return mockDraft(brief, budget);
  const budgetLine = budget
    ? `Total budget: ${budget} USD. Split it across the milestones; the amounts must add up exactly to ${budget}.`
    : 'No budget was given. Propose reasonable amounts in USD.';
  const prompt = `Brief:
"""
${brief}
"""
${budgetLine}

Return JSON with this shape:
{
  "title": "short agreement title, at most 8 words",
  "summary": "one sentence describing the job",
  "milestones": [
    { "title": "...", "description": "one sentence", "amount": 0, "criteria": ["...", "..."] }
  ],
  "assumptions": ["points the brief leaves open that both sides should confirm"]
}
Rules: 2 to 4 milestones in delivery order, 2 to 5 criteria each, at most 3 assumptions.`;
  return complete({ system: DRAFT_SYSTEM, prompt });
}

// ---------- Delivery review ----------

const REVIEW_SYSTEM = `You are the impartial reviewer inside ProofPay. A client is holding money for a milestone.
You decide, criterion by criterion, whether the freelancer's delivery shows that the criterion is met.
Use "met" only when the notes or the attached image give concrete evidence.
Use "not_met" when the delivery contradicts the criterion or clearly lacks what it asks for.
Use "unclear" when the claim cannot be verified from what was provided, for example a link you cannot open with no description.
You cannot open links. Be fair to both sides and quote specifics. Write in the same language as the criteria. Return only JSON.`;

export async function reviewDelivery({ milestone, delivery }) {
  if (aiProvider() === 'mock') return mockReview(milestone, delivery);
  const criteria = milestone.criteria.map((c) => `- [${c.id}] ${c.text}`).join('\n');
  const links = delivery.links?.length ? delivery.links.map((l) => `- ${l}`).join('\n') : '(none)';
  const prompt = `Milestone: ${milestone.title}
Description: ${milestone.description || ''}
Acceptance criteria:
${criteria}

Freelancer's delivery notes:
"""
${delivery.text || '(no notes)'}
"""
Links provided (you cannot open them):
${links}
Image attached: ${delivery.image ? 'yes, see the image' : 'no'}

Return JSON:
{
  "verdicts": [ { "criterion_id": "c1", "verdict": "met | not_met | unclear", "evidence": "one sentence pointing at what in the delivery supports this" } ],
  "summary": "two sentences for the client",
  "notes_for_freelancer": "what would close the remaining gaps, or an empty string"
}
Give exactly one verdict per criterion id.`;
  const image = delivery.image
    ? { mime: delivery.image.mime, base64: delivery.image.dataUrl.split(',')[1] }
    : null;
  const raw = await complete({ system: REVIEW_SYSTEM, prompt, image });
  return normalizeReview(raw, milestone);
}

function normalizeReview(raw, milestone) {
  const allowed = new Set(['met', 'not_met', 'unclear']);
  const verdicts = milestone.criteria.map((c) => {
    const found = (raw.verdicts || []).find((v) => v.criterion_id === c.id) || {};
    const verdict = allowed.has(found.verdict) ? found.verdict : 'unclear';
    return { criterionId: c.id, verdict, evidence: String(found.evidence || 'No evidence given.').slice(0, 400) };
  });
  return {
    verdicts,
    summary: String(raw.summary || '').slice(0, 600),
    notes: String(raw.notes_for_freelancer || '').slice(0, 600),
  };
}

// ---------- Mock mode (lets you run the full flow without an AI key) ----------

function mockDraft(brief, budget) {
  const sentences = brief
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);
  const half = Math.max(1, Math.ceil(sentences.length / 2));
  const total = Number(budget) || 400;
  const first = Math.round(total * 0.4);
  return {
    title: 'Freelance agreement (mock draft)',
    summary: sentences[0] || brief.slice(0, 120),
    milestones: [
      { title: 'First draft', description: 'Initial version for feedback.', amount: first, criteria: sentences.slice(0, half).slice(0, 4) },
      { title: 'Final delivery', description: 'Finished files as described.', amount: total - first, criteria: (sentences.slice(half).length ? sentences.slice(half) : ['Final files are delivered']).slice(0, 4) },
    ],
    assumptions: ['This draft was made without an AI key. Add one to .env for real drafting.'],
  };
}

function mockReview(milestone, delivery) {
  const haystack = `${delivery.text || ''} ${(delivery.links || []).join(' ')}`.toLowerCase();
  const verdicts = milestone.criteria.map((c) => {
    const words = c.text.toLowerCase().match(/[\p{L}\d]{5,}/gu) || [];
    const hits = words.filter((w) => haystack.includes(w)).length;
    const share = words.length ? hits / words.length : 0;
    const verdict = share >= 0.5 ? 'met' : share >= 0.2 ? 'unclear' : 'not_met';
    return { criterionId: c.id, verdict, evidence: `Mock check: ${hits} of ${words.length} key words found in the delivery.` };
  });
  return { verdicts, summary: 'Mock review based on keyword overlap. Add an AI key for a real review.', notes: '' };
}
