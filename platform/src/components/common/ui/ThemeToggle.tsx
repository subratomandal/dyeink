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
            className="h-10 w-10 rounded-full"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            <span className="sr-only">Toggle theme</span>
        </Button>
    )
}
