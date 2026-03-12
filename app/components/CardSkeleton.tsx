export default function CardSkeleton() {
  return (
    <div className="border border-black">
      {/* Cover skeleton */}
      <div className="aspect-[4/5] bg-gray-100 animate-pulse" />

      {/* Body skeleton */}
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-100 animate-pulse w-3/4" />
        <div className="h-3 bg-gray-100 animate-pulse w-full" />
        <div className="h-3 bg-gray-100 animate-pulse w-2/3" />
        <div className="flex gap-2 pt-1">
          <div className="h-5 w-12 bg-gray-100 animate-pulse rounded-sm" />
          <div className="h-5 w-16 bg-gray-100 animate-pulse rounded-sm" />
        </div>
        <div className="h-3 bg-gray-100 animate-pulse w-1/3 pt-1" />
      </div>
    </div>
  );
}
