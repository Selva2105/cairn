import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cairn/ui';

export default function Index() {
  return (
    <main className="container flex min-h-screen flex-col items-center justify-center gap-6 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Cairn</CardTitle>
          <CardDescription>
            Household operations platform -- theme smoke test.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <Badge>Primary</Badge>
            <Badge variant="success">Up to date</Badge>
            <Badge variant="warning">Renews in 12 days</Badge>
            <Badge variant="destructive">Expired 3 days ago</Badge>
          </div>
          <Button>Add document</Button>
        </CardContent>
      </Card>
    </main>
  );
}
