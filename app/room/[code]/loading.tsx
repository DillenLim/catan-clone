export default function Loading() {
    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="animate-pulse flex flex-col items-center gap-4">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <div className="text-blue-400 font-bold uppercase tracking-widest text-sm">Loading Game Engine...</div>
            </div>
        </div>
    );
}
