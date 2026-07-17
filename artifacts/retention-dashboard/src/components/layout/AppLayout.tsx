import * as React from "react"
import { Link, useLocation } from "wouter"
import { Activity, BarChart2, PieChart, Settings, FileBox, LineChart, Terminal, Zap, HardDrive } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface AppLayoutProps {
  children: React.ReactNode
}

const navItems = [
  { name: "Overview", path: "/", icon: Terminal },
  { name: "Analysis", path: "/analysis", icon: BarChart2 },
  { name: "Retention", path: "/retention", icon: Activity },
  { name: "NUU & Signup", path: "/nuu", icon: LineChart },
  { name: "Job Runner", path: "/jobs", icon: Zap },
  { name: "Artifacts", path: "/charts", icon: FileBox },
  { name: "Settings", path: "/config", icon: Settings },
]

export function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation()

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-background md:flex-row">
      <aside className="fixed top-0 left-0 z-40 h-screen w-64 border-r bg-card hidden md:block">
        <div className="flex h-14 items-center border-b px-4">
          <HardDrive className="mr-2 h-5 w-5 text-primary" />
          <span className="font-bold tracking-tight text-foreground">RETENTION<span className="text-primary">DB</span></span>
        </div>
        <div className="flex h-[calc(100vh-3.5rem)] flex-col gap-2 p-4">
          <nav className="grid gap-1">
            {navItems.map((item) => {
              const isActive = location === item.path
              return (
                <Link key={item.path} href={item.path} className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                  isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                )}>
                  <item.icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                  {item.name}
                  {isActive && (
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </Link>
              )
            })}
          </nav>
          
          <div className="mt-auto border-t pt-4">
            <div className="rounded-md bg-secondary p-3">
              <div className="text-xs font-medium text-muted-foreground mb-1">Status</div>
              <div className="flex items-center gap-2 text-sm font-mono text-primary">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                SYSTEM ONLINE
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile nav placeholder */}
      <div className="md:hidden flex h-14 items-center border-b px-4 bg-card">
        <HardDrive className="mr-2 h-5 w-5 text-primary" />
        <span className="font-bold tracking-tight">RETENTION<span className="text-primary">DB</span></span>
      </div>

      <main className="flex-1 md:pl-64">
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
