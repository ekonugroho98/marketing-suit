const colors = {
  blue: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  green: 'bg-success/15 text-success border border-success/20',
  yellow: 'bg-warning/15 text-warning border border-warning/20',
  red: 'bg-danger/15 text-danger border border-danger/20',
  purple: 'bg-purple-500/15 text-purple-400 border border-purple-500/20',
  gray: 'bg-white/8 text-text-secondary border border-white/10',
  pink: 'bg-pink-500/15 text-pink-400 border border-pink-500/20',
  cyan: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20',
  indigo: 'bg-primary-500/15 text-primary-400 border border-primary-500/20',
}

const statusColors = {
  draft: 'gray',
  approved: 'indigo',
  scheduled: 'blue',
  published: 'green',
  failed: 'red',
}

const pillarColors = {
  awareness: 'blue',
  showcase: 'purple',
  education: 'green',
  social_proof: 'yellow',
}

export default function Badge({ children, color = 'gray', className = '' }) {
  return (
    <span className={`badge ${colors[color] || colors.gray} ${className}`}>
      {children}
    </span>
  )
}

export function StatusBadge({ status }) {
  const labels = { draft: 'Draft', approved: 'Approved', scheduled: 'Scheduled', published: 'Published', failed: 'Failed' }
  return <Badge color={statusColors[status]}>{labels[status] || status}</Badge>
}

export function PillarBadge({ pillar }) {
  const labels = { awareness: 'Awareness', showcase: 'Showcase', education: 'Education', social_proof: 'Social Proof' }
  return <Badge color={pillarColors[pillar]}>{labels[pillar] || pillar}</Badge>
}
