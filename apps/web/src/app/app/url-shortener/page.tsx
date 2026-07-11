import { UrlShortenerTool } from '@/components/url-shortener/url-shortener-tool'
import { DesktopOnlineGate } from '@/components/desktop/desktop-online-gate'
export default function UrlShortenerPage() {
    return (
        <DesktopOnlineGate toolName="URL Shortener">
            <div className="h-full w-full min-h-0 overflow-y-auto p-2 md:p-4">
                <UrlShortenerTool />
            </div>
        </DesktopOnlineGate>
    )
}
