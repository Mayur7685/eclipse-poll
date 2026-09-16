import { useState, useEffect } from 'react'

const STORAGE_KEY = 'zkpoll_onboarded'

const STEPS = [
  {
    icon: 'key',
    title: 'Join a Community',
    body: 'Communities gate access using token balances, NFT ownership, or social follows. The off-chain verifier checks your eligibility and issues a credential on Midnight Network.',
  },
  {
    icon: 'vote',
    title: 'Cast a Ranked Vote',
    body: 'Rank options using MDCT — your per-option weights are ZK-private before being submitted. Who voted is public; how you voted stays private.',
  },
  {
    icon: 'chart',
    title: 'Read the Results',
    body: 'After the poll closes, the creator calls Midnight Indexer reads tallies directly — no reveal step needed. The Midnight Indexer reads the on-chain tally and publishes results on-chain.',
  },
]

export default function OnboardingTutorial() {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true)
  }, [])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  const current = STEPS[step]
  const isLast  = step === STEPS.length - 1

  return (
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}
      onClick={dismiss}
    >
      <div
        className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Progress dots */}
        <div className="flex gap-1.5 justify-center mb-6">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`w-2 h-2 rounded-full transition-all ${i === step ? 'bg-[#0070F3] w-5' : 'bg-gray-200'}`}
            />
          ))}
        </div>

        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
          {current.icon === 'key' && <svg className="w-6 h-6 text-[#0070F3]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>}
          {current.icon === 'vote' && <svg className="w-6 h-6 text-[#0070F3]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11V20a2 2 0 01-2 2H4a2 2 0 01-2-2V11"/><path d="M22 11H2"/><path d="M12 15v-4"/><path d="M9 12l3-3 3 3"/></svg>}
          {current.icon === 'chart' && <svg className="w-6 h-6 text-[#0070F3]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>}
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{current.title}</h2>
        <p className="text-sm text-gray-500 leading-relaxed">{current.body}</p>

        <div className="flex gap-3 mt-8 justify-between items-center">
          <button
            onClick={dismiss}
            className="text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors"
          >
            Skip
          </button>
          <button
            onClick={isLast ? dismiss : () => setStep(s => s + 1)}
            className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-2.5 rounded-full text-sm font-medium transition-colors"
          >
            {isLast ? 'Get Started →' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  )
}
