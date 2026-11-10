# ProofPay

**Money moves when the work proves itself.**

ProofPay is milestone escrow for freelancers and their clients, run by an AI agent and PayPal Braintree. The agent turns an informal brief into milestones with criteria anyone can check, Braintree holds each milestone's payment on the client's card, the agent reviews the delivery against those criteria, and the client pays out the share the evidence supports. That can be the full amount, a partial amount, or nothing.

## The problem

When a client and a freelancer agree on work outside a big platform, neither side is protected. Freelancers deliver and wait for money that may never come. Clients pay up front for work that may not match what they asked for. Most disputes trace back to the same cause: nobody wrote down what "done" means in terms you can check.

## How it works

1. **Brief to agreement.** The client describes the job in plain language. The agent drafts 2 to 4 milestones, splits the budget, and writes acceptance criteria that name something observable (a file format, a count, a visible feature). It lists open points both sides should settle. Both sides approve before any money moves.
2. **Hold, don't charge.** The client funds a milestone through Braintree Drop-in. ProofPay creates the transaction with `submitForSettlement: false`, so the amount is authorized on the card but not captured.
3. **Evidence review.** The freelancer submits notes, links and an optional preview image. The agent gives each criterion a verdict (met, not met, unclear) with one sentence of evidence. It is told it cannot open links, so an undescribed link is marked unclear instead of being taken on trust.
4. **Proportional settlement.** ProofPay turns the verdicts into a suggested payout with fixed, visible weights: met counts 1, unclear 0.5, not met 0. The client can pay the suggestion, adjust it, pay in full, or release the hold. A partial payout is a real Braintree partial settlement of the authorized amount; the rest is never charged.

The freelancer can send revisions, which are reviewed again, until the client settles.

## How PayPal is used

ProofPay uses Braintree, PayPal's payment gateway, in the sandbox:

| Step | Braintree call |
| --- | --- |
| Load the payment form | `clientToken.generate` and Braintree Drop-in on the client |
| Hold the milestone amount | `transaction.sale` with `options.submitForSettlement: false` (authorization only) |
| Pay in full or in part | `transaction.submitForSettlement(id, amount)` with an amount up to the authorized total |
| Release the hold | `transaction.void(id)` |
| Show live status | `transaction.find(id)` |

Every transaction ID and status is shown in the app and appears in the Braintree sandbox control panel.

## How AI is used

The AI layer (`lib/ai.js`) works with Google Gemini or Anthropic Claude over their REST APIs, chosen with one environment variable. It does two jobs:

- **Contract agent:** brief to milestones, amounts and checkable criteria, as structured JSON.
- **Reviewer:** delivery text, links and image against each criterion, returning verdicts and evidence as structured JSON.

The payout number is deliberately computed in code from the verdicts, not produced by the model, so both sides can see exactly how it was reached. A `mock` provider lets the whole flow run without an AI key.

## Run it locally

Requirements: Node.js 20 or later, a Braintree sandbox account, and a Gemini or Anthropic API key.

```bash
npm install
cp .env.example .env    # then fill in the keys
npm run dev             # http://localhost:3000
```

Braintree keys are in the sandbox control panel under Settings, then API. A free Gemini key is available at https://aistudio.google.com.

Test card for the sandbox: `4111 1111 1111 1111`, any future expiry date, any CVV.

### Try the full flow

1. Click "Fill in an example" and then "Draft milestones".
2. Approve in the client view, switch to the freelancer view, approve again.
3. In the client view, hold the first milestone with the test card.
4. In the freelancer view, submit a delivery. Leave one criterion out to see a partial suggestion.
5. In the client view, pay the suggested amount and check the transaction in the Braintree control panel.

## Deploy

`render.yaml` deploys ProofPay to Render as a Node web service. Add the Braintree and AI keys as environment variables in the Render dashboard.

## Limits and what comes next

This is a hackathon prototype. There are no user accounts: one browser switches between the client and freelancer views. Data is stored in a JSON file, which is enough for a single demo instance. Card authorizations expire after a few days, so a production version would vault the payment method and charge it when the milestone settles, and would pay freelancers out through PayPal Payouts. A dispute flow, where both sides answer the reviewer's open questions before a second review, is the next feature.

## Built with

Next.js 15, React 19, Braintree Node SDK, Braintree Web Drop-in, Google Gemini or Anthropic Claude.

## License

MIT. See `LICENSE`.
