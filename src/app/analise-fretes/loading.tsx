import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-9 w-64" />
        <Skeleton className="mt-2 h-4 w-96" />
      </div>
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-10 w-[160px]" />
        <Skeleton className="h-10 w-[160px]" />
        <Skeleton className="h-10 w-[200px]" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-3 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-20" />
              <Skeleton className="mt-2 h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-7">
        <Card className="md:col-span-4">
          <CardContent className="pt-6">
            <Skeleton className="h-[260px] w-full" />
          </CardContent>
        </Card>
        <Card className="md:col-span-3">
          <CardContent className="pt-6">
            <Skeleton className="h-[260px] w-full" />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardContent className="pt-6 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
