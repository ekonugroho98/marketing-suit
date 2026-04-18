const colors = {
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  red: 'bg-red-100 text-red-700',
  purple: 'bg-purple-100 text-purple-700',
  gray: 'bg-gray-100 text-gray-600',
  pink: 'bg-pink-100 text-pink-700',
}

const statusColors = {
  draft: 'gray',
  approved: 'blue',
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
