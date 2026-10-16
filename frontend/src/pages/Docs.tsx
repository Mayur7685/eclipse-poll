// Docs — Eclipse Poll documentation

import { useState } from 'react'
import { Link } from 'react-router-dom'

const sections = [
  { id: 'overview',        title: 'Overview' },
  { id: 'getting-started', title: 'Getting Started' },
  { id: 'communities',     title: 'Communities' },
  { id: 'credentials',     title: 'Credentials' },
  { id: 'poll-types',      title: 'Poll Types' },
  { id: 'voting',          title: 'Casting a Vote' },
  { id: 'results',         title: 'Results' },
  { id: 'my-votes',        title: 'My Votes' },
  { id: 'faq',             title: 'FAQ' },
  { id: 'tech',            title: 'Tech Stack' },
]

// SVG icon per section
const sectionIcon: Record<string, React.ReactNode> = {
  overview:        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/></svg>,
  'getting-started': <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
  communities:     <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  credentials:     <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/></svg>,
  'poll-types':    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
  voting:          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 12l2 2 4-4"/></svg>,
  results:         <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  'my-votes':      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>,
  faq:             <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="2"/></svg>,
  tech:            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
}

function Card({ title, children }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 mb-4">
      {title && <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{title}</p>}
      {children}
    </div>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 mb-5">
      <div className="w-7 h-7 rounded-full bg-[#0070F3] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{n}</div>
      <div>
        <p className="text-sm font-semibold text-gray-900 mb-1">{title}</p>
        <div className="text-sm text-gray-600 leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

function Q({ q, a }: { q: string; a: string }) {
  return (
    <div className="border border-gray-100 rounded-xl p-4 mb-3">
      <p className="text-sm font-semibold text-gray-900 mb-1.5">{q}</p>
      <p className="text-sm text-gray-600 leading-relaxed">{a}</p>
    </div>
  )
}

const content: Record<string, React.ReactNode> = {
  overview: (
    <div className="space-y-4">
      <p className="text-gray-600 leading-relaxed">
        <strong>Eclipse Poll</strong> is a privacy-preserving governance dApp built on{' '}
        <a href="https://midnight.network" target="_blank" rel="noopener noreferrer" className="text-[#0070F3] hover:underline">Midnight Network</a>.
        Communities create polls, voters cast ballots using Zero-Knowledge proofs — your vote is counted but never revealed.
      </p>
      <Card title="Key Features">
        <ul className="text-sm text-gray-600 space-y-2">
          <li><strong>Private voting</strong> — Your choice is a ZK private witness. Only tallies are on-chain.</li>
          <li><strong>Community governance</strong> — Create communities with custom eligibility rules.</li>
          <li><strong>One-time credentials</strong> — Prove eligibility once, vote on all community polls.</li>
          <li><strong>4 poll types</strong> — Single choice, ranked, approval, hierarchical.</li>
          <li><strong>Decentralized tallies</strong> — Results read directly from Midnight blockchain.</li>
        </ul>
      </Card>
      <Card title="Network">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full font-medium">Midnight Preprod</span>
          <span className="bg-green-50 text-green-700 border border-green-100 px-2.5 py-1 rounded-full font-medium">ZK Proofs (WASM)</span>
          <span className="bg-gray-100 text-gray-600 border border-gray-200 px-2.5 py-1 rounded-full font-medium">1AM Wallet</span>
          <span className="bg-purple-50 text-purple-700 border border-purple-100 px-2.5 py-1 rounded-full font-medium">Blockfrost Indexer</span>
        </div>
      </Card>
    </div>
  ),

  'getting-started': (
    <div className="space-y-2">
      <p className="text-gray-600 leading-relaxed mb-4">Start voting in 3 steps.</p>
      <Step n={1} title="Install 1AM Wallet">
        Eclipse Poll requires the{' '}
        <a href="https://1am.xyz" target="_blank" rel="noopener noreferrer" className="text-[#0070F3] hover:underline">1AM Wallet</a>{' '}
        browser extension. It handles ZK proof generation locally — your key never leaves your device. Set the wallet network to <strong>Preprod</strong>.
      </Step>
      <Step n={2} title="Get tNIGHT tokens">
        The Midnight preview testnet uses tNIGHT for fees. Get some from the{' '}
        <a href="https://midnight-tmnight-preview.nethermind.dev/" target="_blank" rel="noopener noreferrer" className="text-[#0070F3] hover:underline">Midnight Faucet</a>.
        Wait a few minutes for DUST (fee currency) to generate from tNIGHT.
      </Step>
      <Step n={3} title="Connect & Vote">
        Click <strong>Connect Wallet</strong> top-right. Browse communities, claim a credential if needed, then cast your vote.
      </Step>
      <Card title="Tips">
        <ul className="text-sm text-gray-600 space-y-1.5">
          <li>• ZK proof generation takes ~10–30 seconds in browser — this is normal</li>
          <li>• Each wallet can only vote once per poll</li>
          <li>• Export your vote key to keep history across devices</li>
        </ul>
      </Card>
    </div>
  ),

  communities: (
    <div className="space-y-4">
      <p className="text-gray-600 leading-relaxed">Communities group polls under shared eligibility rules.</p>
      <Card title="Credential Types">
        <div className="space-y-3 text-sm">
          <div><span className="bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded-full text-xs font-medium mr-2">Open</span>Anyone can vote — no requirements</div>
          <div><span className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full text-xs font-medium mr-2">Allowlist</span>Only specific wallet addresses can vote</div>
          <div><span className="bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full text-xs font-medium mr-2">Social OAuth</span>Must verify Twitter, Discord, or GitHub</div>
        </div>
      </Card>
      <Card title="Creating a Community">
        <ol className="text-sm text-gray-600 list-decimal list-inside space-y-1.5">
          <li>Go to <Link to="/create" className="text-[#0070F3] hover:underline">Create Community</Link></li>
          <li>Choose a name and credential type</li>
          <li>For Social OAuth: add requirement groups (AND/OR logic)</li>
          <li>Submit — stored on IPFS + Midnight</li>
        </ol>
      </Card>
      <Card title="Requirement Groups">
        <p className="text-sm text-gray-600">
          Combine multiple requirements with AND/OR logic. Example: "Follow @MidnightNtwrk <strong>AND</strong> be a Discord member" or "Twitter follow <strong>OR</strong> GitHub contributor".
        </p>
      </Card>
    </div>
  ),

  credentials: (
    <div className="space-y-4">
      <p className="text-gray-600 leading-relaxed">
        Credentials prove eligibility once. Stored as a ZK nullifier on-chain — claim once, vote on all community polls.
      </p>
      <Step n={1} title="Check eligibility">Open a community → Credentials Hub. See requirements and your current status.</Step>
      <Step n={2} title="Connect social accounts">For Social OAuth: connect Twitter/Discord/GitHub via OAuth. Data verified off-chain — only ZK proof goes on-chain.</Step>
      <Step n={3} title="Claim on-chain">Click <strong>Verify & Get Credential</strong>. Wallet generates a ZK proof and submits a nullifier to Midnight (~30s).</Step>
      <Card title="What's stored on-chain?">
        <p className="text-sm text-gray-600">Only a <strong>cryptographic nullifier</strong> — a hash of your secret key + community ID. Nobody can link it to your identity or social accounts.</p>
      </Card>
      <Card title="Credential Decay">
        <p className="text-sm text-amber-700">Voting power decreases over 5 periods. Renew your credential periodically to maintain full weight.</p>
      </Card>
    </div>
  ),

  'poll-types': (
    <div className="space-y-6">
      <p className="text-gray-600 leading-relaxed">
        Eclipse Poll supports four voting mechanisms. Each type is enforced on-chain by the Midnight smart contract — the circuit verifies your vote structure matches the poll type before accepting it.
      </p>

      {/* Single Choice */}
      <div className="border border-gray-100 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Single Choice</p>
            <p className="text-xs text-blue-600 mt-0.5">castBinaryVote circuit</p>
          </div>
          <span className="text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full">Simple</span>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-gray-700 leading-relaxed">
            The most straightforward poll type. Voters pick <strong>exactly one option</strong> from a list of 2–8 choices. Each vote adds +1 to that option's tally counter on-chain.
          </p>
          <div className="bg-gray-50 rounded-xl p-3 text-sm">
            <p className="font-medium text-gray-700 mb-1.5">How it works</p>
            <ul className="text-gray-600 space-y-1">
              <li>1. Select one option from the list</li>
              <li>2. Confirm in the modal — your choice is a private ZK witness</li>
              <li>3. On-chain: the circuit reads your choice via <code className="bg-gray-100 px-1 rounded text-xs">getVoteChoice()</code> witness</li>
              <li>4. The selected option's tally counter increments by 1</li>
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="font-medium text-gray-700 mb-1">Best for</p>
              <ul className="text-gray-600 space-y-0.5 text-xs">
                <li>• Yes / No decisions</li>
                <li>• Feature flag votes</li>
                <li>• Choosing between proposals</li>
                <li>• Single-winner elections</li>
              </ul>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="font-medium text-gray-700 mb-1">Limitations</p>
              <ul className="text-gray-600 space-y-0.5 text-xs">
                <li>• No nuance — all-or-nothing</li>
                <li>• Susceptible to vote splitting</li>
                <li>• Doesn't capture 2nd preferences</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Ranked Choice */}
      <div className="border border-gray-100 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 bg-green-50 border-b border-green-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Ranked Choice</p>
            <p className="text-xs text-green-600 mt-0.5">castRankedVote circuit</p>
          </div>
          <span className="text-xs font-medium bg-green-100 text-green-700 border border-green-200 px-2.5 py-1 rounded-full">Ranked</span>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-gray-700 leading-relaxed">
            Voters assign a <strong>weight (0–255)</strong> to each option. Options ranked higher receive more votes. Weights for all 8 slots are submitted as a private vector — the circuit tallies each option's weight on-chain.
          </p>
          <div className="bg-gray-50 rounded-xl p-3 text-sm">
            <p className="font-medium text-gray-700 mb-1.5">How it works</p>
            <ul className="text-gray-600 space-y-1">
              <li>1. Tap options in order of preference — each tap assigns a rank weight</li>
              <li>2. Weights are stored as a <code className="bg-gray-100 px-1 rounded text-xs">Vector&lt;8, Uint&lt;8&gt;&gt;</code> private witness</li>
              <li>3. On-chain: each option's tally increments by its assigned weight</li>
              <li>4. Options with weight 0 don't contribute to the tally</li>
            </ul>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700">
            <strong>Example:</strong> 4 options — you assign weights [10, 7, 3, 0]. Option A gets +10, B gets +7, C gets +3, D gets nothing. The tally reflects your relative preferences.
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="font-medium text-gray-700 mb-1">Best for</p>
              <ul className="text-gray-600 space-y-0.5 text-xs">
                <li>• Feature prioritization</li>
                <li>• Team/board elections</li>
                <li>• Agenda ordering</li>
                <li>• Budget weight allocation</li>
              </ul>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="font-medium text-gray-700 mb-1">Notes</p>
              <ul className="text-gray-600 space-y-0.5 text-xs">
                <li>• Max 8 options per poll</li>
                <li>• Weights are 0–255 per option</li>
                <li>• Unranked options get weight 0</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Approval Voting */}
      <div className="border border-gray-100 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Approval Voting</p>
            <p className="text-xs text-amber-600 mt-0.5">castApprovalVote circuit</p>
          </div>
          <span className="text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full">Approval</span>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-gray-700 leading-relaxed">
            Voters <strong>approve any number of options</strong> — from none to all. Each approved option receives exactly +1 vote. Good for finding consensus across multiple acceptable choices.
          </p>
          <div className="bg-gray-50 rounded-xl p-3 text-sm">
            <p className="font-medium text-gray-700 mb-1.5">How it works</p>
            <ul className="text-gray-600 space-y-1">
              <li>1. Check any/all options you find acceptable</li>
              <li>2. Approvals are stored as a <code className="bg-gray-100 px-1 rounded text-xs">Vector&lt;8, Boolean&gt;</code> private witness</li>
              <li>3. On-chain: each approved option's tally increments by 1</li>
              <li>4. Unapproved options don't change</li>
            </ul>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
            <strong>Example:</strong> 4 candidates — you approve A, B, D (not C). Tallies: A+1, B+1, C+0, D+1. The candidate with the most approvals wins.
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="font-medium text-gray-700 mb-1">Best for</p>
              <ul className="text-gray-600 space-y-0.5 text-xs">
                <li>• Multi-seat elections</li>
                <li>• Selecting multiple funded projects</li>
                <li>• Finding broadly acceptable options</li>
                <li>• Low-friction community votes</li>
              </ul>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="font-medium text-gray-700 mb-1">Notes</p>
              <ul className="text-gray-600 space-y-0.5 text-xs">
                <li>• No strategic voting incentive</li>
                <li>• Approving all = same as approving none</li>
                <li>• Results show most broadly liked options</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Hierarchical */}
      <div className="border border-gray-100 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Hierarchical Voting</p>
            <p className="text-xs text-gray-500 mt-0.5">castHierarchicalVote circuit</p>
          </div>
          <span className="text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200 px-2.5 py-1 rounded-full">Hierarchical</span>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-gray-700 leading-relaxed">
            The most complex type — voters assign weights to options <strong>within nested category layers</strong> (up to 4 layers of 8 options each). Each layer has a parent option it belongs to. Tallies are tracked per layer and parent.
          </p>
          <div className="bg-gray-50 rounded-xl p-3 text-sm">
            <p className="font-medium text-gray-700 mb-1.5">How it works</p>
            <ul className="text-gray-600 space-y-1">
              <li>1. Browse root options — tap to rank within each category</li>
              <li>2. Drill into sub-options via the "sub ›" button</li>
              <li>3. Weights stored as <code className="bg-gray-100 px-1 rounded text-xs">Vector&lt;4, Vector&lt;8, Uint&lt;8&gt;&gt;&gt;</code> per layer</li>
              <li>4. On-chain: hierarchical tallies updated per parentId + optionIndex</li>
            </ul>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700">
            <strong>Example:</strong> Budget allocation — Layer 0: Engineering (40%), Marketing (30%), Operations (30%). Layer 1 under Engineering: Frontend (50%), Backend (30%), Infra (20%). Each drill-down gets its own ranked weights.
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="font-medium text-gray-700 mb-1">Best for</p>
              <ul className="text-gray-600 space-y-0.5 text-xs">
                <li>• Budget allocation across departments</li>
                <li>• Multi-tier governance decisions</li>
                <li>• Roadmap prioritization with themes</li>
                <li>• Complex policy votes with sub-clauses</li>
              </ul>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="font-medium text-gray-700 mb-1">Notes</p>
              <ul className="text-gray-600 space-y-0.5 text-xs">
                <li>• Max 4 layers, 8 options each</li>
                <li>• Each layer tallied independently</li>
                <li>• Most complex — use only when needed</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison table */}
      <div className="border border-gray-100 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Quick Comparison</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Type</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Selections</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Tally method</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Complexity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                ['Single Choice', '1 option', '+1 to chosen option', 'Low'],
                ['Ranked Choice', 'Up to 8, with weights', '+weight per option', 'Medium'],
                ['Approval Voting', 'Any number', '+1 per approved option', 'Low'],
                ['Hierarchical', 'Up to 32 (4×8), layered', '+weight per layer/option', 'High'],
              ].map(([type, sel, tally, complexity]) => (
                <tr key={type as string} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-800">{type}</td>
                  <td className="px-4 py-2.5 text-gray-600">{sel}</td>
                  <td className="px-4 py-2.5 text-gray-600">{tally}</td>
                  <td className="px-4 py-2.5 text-gray-600">{complexity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  ),

  voting: (
    <div className="space-y-2">
      <p className="text-gray-600 mb-4">Step-by-step guide to casting a vote.</p>
      <Step n={1} title="Open a poll">Go to <Link to="/polls" className="text-[#0070F3] hover:underline">Polls</Link> or browse through a community.</Step>
      <Step n={2} title="Get credential (gated polls)">If required, claim your community credential first from the Credentials Hub.</Step>
      <Step n={3} title="Select your choice">Choose option(s) based on poll type. Ranked: tap to assign weights. Approval: check all you approve.</Step>
      <Step n={4} title="Confirm">Click <strong>Submit Vote</strong> → review in the confirmation modal → click <strong>Confirm</strong>.</Step>
      <Step n={5} title="Approve in wallet">1AM Wallet generates ZK proof (~10–30s) then asks for signature. Approve in the extension popup.</Step>
      <Step n={6} title="Done">Transaction submitted to Midnight. Vote counted, results update on-chain.</Step>
      <Card title="Privacy Guarantee">
        <p className="text-sm text-gray-600">Your vote choice is a private ZK witness. The on-chain transaction only proves <em>a valid vote was cast</em> — not what you chose. Tallies show only aggregate counts.</p>
      </Card>
    </div>
  ),

  results: (
    <div className="space-y-4">
      <p className="text-gray-600">Results are read directly from Midnight blockchain — no server needed.</p>
      <Card title="Live Tallies">
        <p className="text-sm text-gray-600">Tally counters update on-chain as votes arrive. See current counts in any poll's <strong>Results</strong> tab.</p>
      </Card>
      <Card title="EV / VP% / CV explained">
        <div className="space-y-2 text-sm text-gray-600">
          <p><strong>EV (Eligible Votes)</strong> — Your total voting power based on credential weight</p>
          <p><strong>VP% (Voting Power %)</strong> — Your share of total votes, adjusted for credential decay</p>
          <p><strong>CV (Counted Votes)</strong> — Votes actually counted in the tally</p>
        </div>
      </Card>
      <Card title="Poll States">
        <div className="flex gap-2 mb-2">
          <span className="bg-green-50 text-green-700 border border-green-100 px-2.5 py-1 rounded-full text-xs font-medium">Active</span>
          <span className="bg-gray-100 text-gray-600 border border-gray-200 px-2.5 py-1 rounded-full text-xs font-medium">Closed</span>
        </div>
        <p className="text-sm text-gray-600">Polls close at their end block or when the creator closes them manually.</p>
      </Card>
    </div>
  ),

  'my-votes': (
    <div className="space-y-4">
      <p className="text-gray-600">Vote history is stored locally — no server holds your choices.</p>
      <Card title="How it works">
        <p className="text-sm text-gray-600">When you vote, your choice is saved in browser localStorage. The <Link to="/my-votes" className="text-[#0070F3] hover:underline">My Votes</Link> page reads this local data to display your history.</p>
      </Card>
      <Card title="Export / Import Key">
        <ol className="text-sm text-gray-600 list-decimal list-inside space-y-1.5">
          <li>Go to <Link to="/my-votes" className="text-[#0070F3] hover:underline">My Votes</Link></li>
          <li>Click <strong>Export Key</strong> → save the file securely</li>
          <li>On a new device, click <strong>Import Key</strong> → upload the file</li>
        </ol>
      </Card>
      <Card title="Important">
        <p className="text-sm text-amber-700">Your vote key cannot be recovered if lost. Export before clearing browser data or switching devices.</p>
      </Card>
    </div>
  ),

  faq: (
    <div>
      <Q q="Can anyone see what I voted?" a="No. Your vote is a private ZK witness — only the aggregated tally is on-chain. Not even the poll creator can see individual votes." />
      <Q q="Can I change my vote after submitting?" a="No. Once confirmed on Midnight, votes are final. The nullifier system ensures each wallet votes exactly once per poll." />
      <Q q="Why does voting take so long?" a="Your browser generates a Zero-Knowledge proof locally (~10–30s). This proves your vote is valid without revealing your choice. After proving, the wallet signs and submits." />
      <Q q="What happens if I lose my browser data?" a="Your on-chain credential and vote nullifiers are permanent on Midnight. Only your local vote history (My Votes display) is lost. Export your key regularly." />
      <Q q="What is a nullifier?" a="A cryptographic hash derived from your secret key + poll ID. It prevents double-voting without revealing your identity — unique per poll, unlinkable to you." />
      <Q q="What wallet do I need?" a="Only the 1AM Wallet browser extension. MetaMask, Phantom, and other wallets are not supported — Midnight is a separate network from Ethereum/Solana." />
      <Q q="Is my social account data stored?" a="No. Social accounts are verified off-chain by the attestation API. Only a ZK attestation proof goes on-chain — your social credentials stay private." />
      <Q q="Can I vote on multiple polls in the same community?" a="Yes! Claim a credential once and vote on every poll in that community without re-verifying." />
      <Q q="Why do I need tNIGHT tokens?" a="The Midnight network charges transaction fees in DUST, which is generated from tNIGHT tokens. Get tNIGHT from the Midnight Faucet and keep some in your wallet." />
    </div>
  ),

  tech: (
    <div className="space-y-4">
      <Card title="Smart Contract">
        <div className="text-sm text-gray-600 space-y-1.5">
          <p><strong>Language:</strong> Compact (Midnight's ZK-native DSL)</p>
          <p><strong>Circuits:</strong> 9 provable circuits (vote, create poll, credential, etc.)</p>
          <p><strong>Network:</strong> Midnight Preprod via Blockfrost</p>
          <p><strong>Contract:</strong> <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">321c2d72d262…</code></p>
        </div>
      </Card>
      <Card title="Frontend">
        <div className="text-sm text-gray-600 space-y-1.5">
          <p><strong>Framework:</strong> React 18 + TypeScript + Vite</p>
          <p><strong>Styling:</strong> Tailwind CSS</p>
          <p><strong>ZK Proofs:</strong> In-browser WASM via @midnight-ntwrk SDK</p>
          <p><strong>Wallet:</strong> 1AM Wallet via DApp Connector API</p>
          <p><strong>Deployment:</strong> Vercel</p>
        </div>
      </Card>
      <Card title="Backend / API">
        <div className="text-sm text-gray-600 space-y-1.5">
          <p><strong>Attestation API:</strong> Express.js + TypeScript</p>
          <p><strong>Signatures:</strong> Schnorr on Jubjub curve (off-chain)</p>
          <p><strong>Storage:</strong> Pinata IPFS for community/poll metadata</p>
          <p><strong>OAuth:</strong> Twitter, Discord, GitHub</p>
          <p><strong>Deployment:</strong> Render</p>
        </div>
      </Card>
      <Card title="Privacy Architecture">
        <ul className="text-sm text-gray-600 space-y-1.5">
          <li>• Vote choices are ZK private witnesses — never on-chain</li>
          <li>• Nullifiers prevent double voting without revealing identity</li>
          <li>• Schnorr attestation proves eligibility without exposing social data</li>
          <li>• Community credentials stored as cryptographic nullifiers on Midnight</li>
          <li>• Vote history stored client-side only (localStorage)</li>
        </ul>
      </Card>
      <div className="flex gap-3">
        <a href="https://github.com/Mayur7685/eclipse-poll" target="_blank" rel="noopener noreferrer"
          className="flex-1 py-2.5 text-center text-sm font-medium bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors">
          GitHub →
        </a>
        <a href="https://explorer.1am.xyz/contract/45e740efa6ea82dff81d898653b810485172cbe55dac841fe67d3d5cd31bdce5?network=preview"
          target="_blank" rel="noopener noreferrer"
          className="flex-1 py-2.5 text-center text-sm font-medium bg-blue-50 text-[#0070F3] border border-blue-100 rounded-xl hover:bg-blue-100 transition-colors">
          Explorer →
        </a>
      </div>
    </div>
  ),
}

export default function Docs() {
  const [active, setActive] = useState('overview')

  const idx = sections.findIndex(s => s.id === active)
  const prev = idx > 0 ? sections[idx - 1] : null
  const next = idx < sections.length - 1 ? sections[idx + 1] : null

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Documentation</h1>
        <p className="text-sm text-gray-500 mt-1">Everything you need to know about Eclipse Poll</p>
      </div>

      <div className="flex gap-8">
        {/* Sidebar — desktop */}
        <aside className="w-48 shrink-0 hidden md:block">
          <div className="sticky top-6 space-y-0.5">
            {sections.map(s => (
              <button key={s.id} onClick={() => setActive(s.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                  active === s.id
                    ? 'bg-[#0070F3] text-white font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}>
                <span className={active === s.id ? 'text-white' : 'text-gray-400'}>
                  {sectionIcon[s.id]}
                </span>
                {s.title}
              </button>
            ))}
          </div>
        </aside>

        {/* Mobile picker */}
        <div className="md:hidden w-full mb-4">
          <select value={active} onChange={e => setActive(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 bg-white">
            {sections.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        </div>

        {/* Content */}
        <main className="flex-1 min-w-0">
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-50">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0070F3] flex items-center justify-center">
                {sectionIcon[active]}
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                {sections.find(s => s.id === active)?.title}
              </h2>
            </div>
            {content[active]}
          </div>

          {/* Prev/Next */}
          <div className="flex justify-between mt-4">
            {prev && (
              <button onClick={() => setActive(prev.id)}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                {prev.title}
              </button>
            )}
            <div className="flex-1" />
            {next && (
              <button onClick={() => setActive(next.id)}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
                {next.title}
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
