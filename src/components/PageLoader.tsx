export default function PageLoader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 animate-[fadeInUp_0.5s_ease-out]">
        <div
          className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin"
        />
        <p className="text-sm text-muted-foreground animate-[fadeIn_0.5s_ease-out_0.3s_both]">
          Загрузка...
        </p>
      </div>
    </div>
  )
}
