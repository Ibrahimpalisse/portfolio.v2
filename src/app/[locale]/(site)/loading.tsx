export default function SiteLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center pt-24">
      <div
        className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent"
        aria-label="Chargement"
      />
    </div>
  );
}
