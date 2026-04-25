import { Moon, Sun } from 'lucide-react'
import { useThemeStore } from '@/stores/themeStore'
import { Button } from '@/components/ui/button'

export default function ThemeToggle() {
    const { theme, toggleTheme } = useThemeStore()
    return (
        <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            className="aspect-square h-11 w-11 shrink-0 !rounded-full border-border/70 bg-background/85 p-0 shadow-[0_10px_30px_hsl(var(--foreground)/0.08)] backdrop-blur transition hover:scale-105 hover:bg-accent"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            <span className="sr-only">Toggle theme</span>
        </Button>
    )
}
