import { Toaster as SonnerToaster, toast } from 'sonner'
import { useThemeStore } from '@/stores/themeStore'

type ToasterProps = React.ComponentProps<typeof SonnerToaster>

export const Toaster = ({ ...props }: ToasterProps) => {
  const theme = useThemeStore((s) => s.theme)
  return (
    <SonnerToaster
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
      }}
      {...props}
    />
  )
}

export { toast }
