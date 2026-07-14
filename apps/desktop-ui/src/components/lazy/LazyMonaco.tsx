"use client"

import dynamic from 'next/dynamic'

// Skeleton component shown while Monaco loads
const MonacoSkeleton = () => (
    <div className="w-full h-full flex items-center justify-center bg-muted/20 border rounded">
        <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Loading editor...</p>
        </div>
    </div>
)

// Dynamically import Monaco Editor (reduces initial bundle by ~3MB)
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
    ssr: false,
    loading: () => <MonacoSkeleton />,
})

export default MonacoEditor
export { MonacoSkeleton }
