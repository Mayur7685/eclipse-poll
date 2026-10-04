import { lazy, Suspense } from 'react'
import { Navigate, Routes, Route } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ThemeProvider } from './contexts/ThemeContext'
import { useWallet } from './hooks/useWallet'
import Layout from './components/Layout'
const LandingPage = lazy(() => import('./pages/LandingPage'))
const PollFeed = lazy(() => import('./pages/PollFeed'))
const CommunityFeed = lazy(() => import('./pages/CommunityFeed'))
const CommunityDetail = lazy(() => import('./pages/CommunityDetail'))
const CommunityPosts = lazy(() => import('./pages/CommunityPosts'))
const PostDetail = lazy(() => import('./pages/PostDetail'))
const PollDetail = lazy(() => import('./pages/PollDetail'))
const PollResults = lazy(() => import('./pages/PollResults'))
const CreateCommunity = lazy(() => import('./pages/CreateCommunity'))
const CreatePoll = lazy(() => import('./pages/CreatePoll'))
const CreateSurvey = lazy(() => import('./pages/CreateSurvey'))
const Surveys = lazy(() => import('./pages/Surveys'))
const Activity = lazy(() => import('./pages/Activity'))
const SurveyDetail = lazy(() => import('./pages/SurveyDetail'))
const MyCredentials = lazy(() => import('./pages/MyCredentials'))
const CredentialsHub = lazy(() => import('./pages/CredentialsHub'))
const MyVotes = lazy(() => import('./pages/MyVotes'))
const AdminSetup = lazy(() => import('./pages/AdminSetup'))
const OAuthCallback = lazy(() => import('./pages/OAuthCallback'))

function HomeGate() {
  const { isConnected } = useWallet()
  return isConnected ? <Navigate to="/polls" replace /> : <LandingPage />
}

export default function App() {
  return (
    <Routes>
      <Route index element={<HomeGate />} />
      {/* OAuth callback routes — rendered outside Layout (popup windows, no nav needed) */}
      <Route path="oauth/:provider/callback" element={<OAuthCallback />} />
      <Route element={<Layout />}>
        <Route path="polls" element={<PollFeed />} />
        <Route path="surveys" element={<Surveys />} />
        <Route path="activity" element={<Activity />} />
        <Route path="communities" element={<CommunityFeed />} />
        <Route path="communities/:id" element={<CommunityDetail />} />
        <Route path="communities/:id/posts" element={<CommunityPosts />} />
        <Route path="communities/:id/posts/:postId" element={<PostDetail />} />
        <Route path="communities/:communityId/polls/:pollId" element={<PollDetail />} />
        <Route path="communities/:communityId/surveys/:pollId" element={<SurveyDetail />} />
        <Route path="communities/:communityId/polls/:pollId/results" element={<PollResults />} />
        <Route path="create" element={<CreateCommunity />} />
        <Route path="create-poll" element={<CreatePoll />} />
        <Route path="create-survey" element={<CreateSurvey />} />
        <Route path="credentials" element={<CredentialsHub />} />
        <Route path="my-credentials" element={<MyCredentials />} />
        <Route path="my-votes" element={<MyVotes />} />
        {/* Admin-only: one-time setup to register attestation provider on-chain */}
        <Route path="admin/setup" element={<AdminSetup />} />
      </Route>
    </Routes>
  )
}
