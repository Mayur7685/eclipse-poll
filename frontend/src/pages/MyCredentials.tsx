import ZKCredentialPanel from '../components/ZKCredentialPanel'

export default function MyCredentials() {
  return (
    <div className="max-w-md mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">My Credentials</h1>
        <p className="text-sm text-gray-500 mt-1.5 leading-relaxed max-w-sm">
          Midnight attestations from communities you've joined — they gate voting access on Midnight Network.
          Your vote choice is ZK-private; only the tally is public on-chain.
        </p>
      </div>
      <ZKCredentialPanel />
    </div>
  )
}
