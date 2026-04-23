import { Link } from 'react-router-dom'
import TopBar from '../../components/layout/TopBar'

const generators = [
  { path: '/generate/caption', icon: '✍️', title: 'Caption Generator', desc: 'IG, Threads, FB, TikTok', color: 'primary' },
  { path: '/generate/carousel', icon: '📑', title: 'Carousel Script', desc: 'IG carousel 5-10 slide', color: 'purple' },
  { path: '/generate/ad-copy', icon: '📢', title: 'Ad Copy', desc: 'Meta & Google Ads', color: 'warning' },
  { path: '/generate/thread', icon: '🧵', title: 'Thread Generator', desc: 'Twitter/X, Threads', color: 'accent' },
  { path: '/generate/repurpose', icon: '♻️', title: 'Repurpose Content', desc: '1 konten -> multi format', color: 'danger' },
  { path: '/generate/video-script', icon: '🎬', title: 'Video Script', desc: 'Reels, TikTok, YT Shorts', color: 'pink' },
  { path: '/generate/hashtags', icon: '#️⃣', title: 'Hashtag Research', desc: 'Trending & niche tags', color: 'cyan' },
]

const colorStyles = {
  primary: {
    bg: 'bg-primary-500/10',
    border: 'border-primary-500/20',
    hoverBorder: 'hover:border-primary-500/40',
    glow: 'hover:shadow-glow-indigo',
    text: 'text-primary-400',
  },
  purple: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    hoverBorder: 'hover:border-purple-500/40',
    glow: 'hover:shadow-glow-purple',
    text: 'text-purple-400',
  },
  warning: {
    bg: 'bg-warning/10',
    border: 'border-warning/20',
    hoverBorder: 'hover:border-warning/40',
    glow: '',
    text: 'text-warning',
  },
  accent: {
    bg: 'bg-success/10',
    border: 'border-success/20',
    hoverBorder: 'hover:border-success/40',
    glow: '',
    text: 'text-success',
  },
  danger: {
    bg: 'bg-danger/10',
    border: 'border-danger/20',
    hoverBorder: 'hover:border-danger/40',
    glow: '',
    text: 'text-danger',
  },
  pink: {
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20',
    hoverBorder: 'hover:border-pink-500/40',
    glow: '',
    text: 'text-pink-400',
  },
  cyan: {
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    hoverBorder: 'hover:border-cyan-500/40',
    glow: 'hover:shadow-glow-cyan',
    text: 'text-cyan-400',
  },
}

export default function GeneratorHub() {
  return (
    <div>
      <TopBar title="AI Content Generator" subtitle="Pilih jenis konten yang ingin kamu buat" />

      {/* Bento Grid Layout */}
      <div className="bento-grid">
        {generators.map((g, index) => {
          const style = colorStyles[g.color] || colorStyles.primary
          // Make first two items larger on desktop
          const size = index < 2 ? 'md' : 'sm'

          return (
            <div key={g.path} className={`bento-item-${size}`}>
              <Link
                to={g.path}
                className={`
                  block h-full p-6 rounded-glass transition-all duration-300
                  glass-card glass-card-hover
                  ${style.bg} ${style.border} ${style.hoverBorder} ${style.glow}
                `}
              >
                <div className="text-3xl mb-4">{g.icon}</div>
                <h3 className={`font-semibold text-lg text-text-primary mb-1`}>{g.title}</h3>
                <p className={`text-sm ${style.text}`}>{g.desc}</p>
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
