import { Link } from "wouter";
import { CircleOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center">
      <CircleOff className="h-12 w-12 text-muted-foreground" />
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="text-sm text-muted-foreground max-w-md">
        That route does not exist in this workspace.
      </p>
      <Button asChild>
        <Link href="/">Back to dashboard</Link>
      </Button>
    </div>
  );
}
