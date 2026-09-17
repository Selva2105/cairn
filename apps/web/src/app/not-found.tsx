import Link from 'next/link';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cairn/ui';
import { Compass, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <Card variant="floating" className="w-full max-w-md text-center">
        <CardHeader className="flex flex-col items-center gap-3 pb-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Compass className="h-7 w-7 animate-pulse" />
          </div>
          <div className="space-y-1">
            <span className="font-mono text-xs font-semibold uppercase tracking-widest text-primary">
              404 Error
            </span>
            <CardTitle className="text-2xl font-bold tracking-tight">
              Page Not Found
            </CardTitle>
          </div>
          <CardDescription className="text-sm max-w-xs">
            The page you are looking for doesn't exist or may have been moved.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 flex justify-center">
          <Button asChild>
            <Link href="/dashboard/overview">
              <Home className="mr-2 h-4 w-4" />
              Return to Overview
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
