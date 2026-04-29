export default function Loading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
      <div className="relative">
        <img 
          src="/bmt-spinner.png" 
          alt="Loading..." 
          className="h-20 w-20 object-contain drop-shadow-[0_0_15px_rgba(0,255,65,0.4)]" 
          style={{ 
            animation: 'spin 0.8s linear infinite',
            transformOrigin: 'center center'
          }}
        />
        {/* Adds a slight glow effect underneath while spinning */}
        <div className="absolute inset-0 bg-accent/20 blur-[20px] rounded-full scale-110 animate-pulse" />
      </div>
    </div>
  );
}
