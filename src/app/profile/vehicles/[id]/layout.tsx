// Nécessaire pour l'export statique avec routes dynamiques
export function generateStaticParams() {
  return []
}

export default function VehicleLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

