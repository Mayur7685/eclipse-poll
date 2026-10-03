import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useWallet } from '../hooks/useWallet'
import { usePosts } from '../hooks/usePosts'
import CreatePostModal from '../components/CreatePostModal'

function readingTime(text: string): string {
  const words = text.split(/\s+/).filter(Boolean).length
  return `${Math.max(1, Math.ceil(words / 200))} min read`
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (days > 0)  return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (mins > 0)  return `${mins}m ago`
  return 'just now'
}

export default function CommunityPosts() {
  const { id = '' } = useParams<{ id: string }>()
  const { address } = useWallet()
  const { posts, loading, error, createPost, deletePost } = usePosts(id)
  const [showModal, setShowModal] = useState(false)
  const [deleting, setDeleting]   = useState<string | null>(null)

  const handleCreate = async (title: string, body: string, imageUrl?: string) => {
    await createPost(title, body, imageUrl)
    setShowModal(false)
  }

  const handleDelete = async (postId: string) => {
    if (!confirm('Delete this post?')) return
    setDeleting(postId)
    try { await deletePost(postId) } finally { setDeleting(null) }
  }

  return (
    <div className="max-w-2xl mx-auto w-full space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to={`/communities/${id}`} className="text-sm text-gray-500 hover:text-gray-900">← Community</Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-sm font-semibold text-gray-900">Posts</h1>
        </div>
        {address && (
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 text-xs font-medium bg-gray-900 text-white px-3.5 py-2 rounded-full hover:bg-gray-800 transition-colors">
            + New Post
          </button>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-5 h-5 border-2 border-[#0070F3] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && <p className="text-sm text-red-500 text-center">{error}</p>}

      {!loading && posts.length === 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center">
          <p className="text-sm text-gray-500 mb-3">No posts yet.</p>
          {address && (
            <button onClick={() => setShowModal(true)} className="text-sm font-medium text-[#0070F3] hover:underline">
              Be the first to post →
            </button>
          )}
        </div>
      )}

      <div className="space-y-3">
        {posts.map(post => {
          const postId = post.id ?? post.post_id ?? ''
          const imageUrl = post.image_url
          const preview = post.body.slice(0, 150).replace(/[#*`\[\]]/g, '')
          const isOwn = address && post.author?.toLowerCase() === address.toLowerCase()

          return (
            <div key={postId} className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-gray-200 hover:shadow-sm transition-all relative group">
              <Link to={`/communities/${id}/posts/${postId}`} className="block">
                <div className="flex gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-semibold text-gray-900 leading-snug mb-1.5">{post.title}</h2>
                    <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">{preview}{post.body.length > 150 ? '…' : ''}</p>
                    <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                      <span className="font-mono">{post.author.slice(0, 6)}…{post.author.slice(-4)}</span>
                      <span>·</span>
                      <span>{readingTime(post.body)}</span>
                      {post.created_at && (
                        <><span>·</span><span>{timeAgo(post.created_at)}</span></>
                      )}
                    </div>
                  </div>
                  {imageUrl && (
                    <img src={imageUrl} alt="" className="w-20 h-20 rounded-xl object-cover shrink-0 border border-gray-100" />
                  )}
                </div>
              </Link>

              {/* Delete button — only shown to post author */}
              {isOwn && (
                <button
                  onClick={() => handleDelete(postId)}
                  disabled={deleting === postId}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-all"
                  title="Delete post"
                >
                  {deleting === postId
                    ? <div className="w-3.5 h-3.5 border border-red-400 border-t-transparent rounded-full animate-spin" />
                    : <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                  }
                </button>
              )}
            </div>
          )
        })}
      </div>

      {showModal && <CreatePostModal onSubmit={handleCreate} onClose={() => setShowModal(false)} />}
    </div>
  )
}
