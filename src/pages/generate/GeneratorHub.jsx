import { Link } from 'react-router-dom'
import TopBar from '../../components/layout/TopBar'

const generators = [
  { path: '/generate/caption', icon: '✍️', title: 'Caption Generator', desc: 'IG, Threads, FB, TikTok', color: 'bg-blue-50 border-blue-200' },
  { path: '/generate/carousel', icon: '📑', title: 'Carousel Script', desc: 'IG carousel 5-10 slide', color: 'bg-purple-50 border-purple-200' },
  { path: '/generate/ad-copy', icon: '📢', title: 'Ad Copy', desc: 'Meta & Google Ads', color: 'bg-orange-50 border-orange-200' },
  { path: '/generate/thread', icon: '🧵', title: 'Thread Generator', desc: 'Twitter/X, Threads', color: 'bg-green-50 border-green-200' },
  { path: '/generate/repurpose', icon: '♻️', title: 'Repurpose Content', desc: '1 konten -> multi format', color: 'bg-red-50 border-red-200' },
  { path: '/generate/video-script', icon: '🎬', title: 'Video Script', desc: 'Reels, TikTok, YT Shorts', color: 'bg-pink-50 border-pink-200' },
  { path: '/generate/hashtags', icon: '#️⃣', title: 'Hashtag Research', desc: 'Trending & niche tags', color: 'bg-teal-50 border-teal-200' },
]

export default function GeneratorHub() {
  return (
    <div>
      <TopBar title="AI Content Generator" subtitle="Pilih jenis konten yang ingin kamu buat" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {generators.map(g => (
          <Link key={g.path} to={g.path} className={`block p-5 rounded-xl border-2 ${g.color} hover:shadow-md transition-all`}>
            <div className="text-2xl mb-3">{g.icon}</div>
            <h3 className="font-semibold text-gray-900">{g.title}</h3>
            <p className="text-sm text-gray-500 mt-1">{g.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
