export default function SiteLoading() {
  return (
    <div
      className="mx-auto flex min-h-[40vh] max-w-5xl items-center justify-center px-4"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="h-1 w-32 overflow-hidden rounded-full bg-foreground/10">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-primary/50" />
      </div>
    </div>
  );
}
