import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"

export default function DashboardLoading() {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar skeleton */}
      <div className="hidden md:block w-[280px] border-r border-border">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded" />
            <Skeleton className="h-6 w-24 rounded" />
          </div>
        </div>
        <div className="p-4">
          <div className="space-y-2">
            {Array(6)
              .fill(null)
              .map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-5 w-24 rounded" />
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header skeleton */}
        <div className="h-16 flex items-center justify-between border-b border-border px-4 md:px-6">
          <Skeleton className="h-9 w-[12rem] rounded-md" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
        </div>

        {/* Content skeleton */}
        <div className="flex-1 p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            {/* Welcome section */}
            <div className="mb-8">
              <Skeleton className="h-8 w-64 mb-2 rounded" />
              <Skeleton className="h-4 w-96 rounded" />
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {Array(3)
                .fill(null)
                .map((_, i) => (
                  <Card key={i}>
                    <CardHeader className="pb-2">
                      <Skeleton className="h-4 w-24 rounded" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-8 w-12 rounded" />
                    </CardContent>
                  </Card>
                ))}
            </div>

            {/* Quick actions */}
            <div className="mb-8">
              <Skeleton className="h-6 w-32 mb-4 rounded" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Array(3)
                  .fill(null)
                  .map((_, i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-10 w-10 rounded mb-2" />
                        <Skeleton className="h-5 w-32 rounded mb-1" />
                        <Skeleton className="h-4 w-full rounded" />
                      </CardHeader>
                      <CardFooter>
                        <Skeleton className="h-9 w-24 ml-auto rounded" />
                      </CardFooter>
                    </Card>
                  ))}
              </div>
            </div>

            {/* Recent activity */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-6 w-32 rounded" />
                <Skeleton className="h-9 w-24 rounded" />
              </div>
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col items-center justify-center text-center">
                    <Skeleton className="h-12 w-12 rounded-full mb-4" />
                    <Skeleton className="h-6 w-48 rounded mb-2" />
                    <Skeleton className="h-4 w-72 rounded mb-4" />
                    <Skeleton className="h-9 w-36 rounded" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Getting started */}
            <div>
              <Skeleton className="h-6 w-32 mb-4 rounded" />
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {Array(3)
                      .fill(null)
                      .map((_, i) => (
                        <div key={i} className="flex items-start gap-4">
                          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                          <div className="flex-1">
                            <Skeleton className="h-5 w-48 rounded mb-1" />
                            <Skeleton className="h-4 w-full rounded" />
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
