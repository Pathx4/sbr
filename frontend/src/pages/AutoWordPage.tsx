export default function AutoWordPage() {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:5000";
  const src = `${backendUrl}/word/index.html?embed=1`;
  
  return (
    <div className="w-full h-full flex flex-col">
      <iframe src={src} className="flex-1 w-full border-none" title="Auto-Word" />
    </div>
  );
}
