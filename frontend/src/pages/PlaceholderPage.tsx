/**
 * Placeholder page for sections not yet fully implemented
 */
import { type LucideIcon } from 'lucide-react'
import { Construction } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface PlaceholderPageProps {
  title: string
  description?: string
  icon?: LucideIcon
}

export function PlaceholderPage({ title, description, icon: Icon = Construction }: PlaceholderPageProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-subtitle">{description}</p>}
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Icon className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="text-lg font-semibold text-muted-foreground">Sección en desarrollo</p>
          <p className="text-sm text-muted-foreground/70 mt-2 max-w-xs">
            Esta funcionalidad está implementada en el backend y estará disponible en la próxima versión del frontend.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
