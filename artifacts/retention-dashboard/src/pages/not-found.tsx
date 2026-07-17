import { Link } from "wouter";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
      <div className="rounded-full bg-destructive/10 p-6">
        <AlertCircle className="w-12 h-12 text-destructive" />
      </div>
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">404 - Page Not Found</h1>
        <p className="text-muted-foreground max-w-[500px]">
          The page you are looking for does not exist or has been moved.
        </p>
      </div>
      <Button asChild className="font-mono mt-4">
        <Link href="/">RETURN TO DASHBOARD</Link>
      </Button>
    </div>
  );
}
