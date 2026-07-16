export default function AdminLoading() {
  return (
    <div
      className="flex min-h-[40vh] items-center justify-center"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="h-1 w-32 overflow-hidden rounded-full bg-foreground/10">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-primary/50" />
      </div>
    </div>
  );
}
