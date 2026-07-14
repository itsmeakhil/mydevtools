import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export interface SendToMenuProps {
  content: string;
  disabled?: boolean;
  className?: string;
}

const TARGET_TOOLS = [
  { id: 'json-formatter', path: '/app/json-formatter', label: 'JSON Formatter' },
  { id: 'base64', path: '/app/base64', label: 'Base64 Encode/Decode' },
  { id: 'url-encode', path: '/app/url-encode', label: 'URL Encode/Decode' },
  { id: 'jwt-decoder', path: '/app/jwt-decoder', label: 'JWT Decoder' },
  { id: 'hash-generator', path: '/app/hash-generator', label: 'Hash Generator' },
  { id: 'qr-code-generator', path: '/app/qr-code-generator', label: 'QR Code Generator' },
];

export function SendToMenu({ content, disabled = false, className }: SendToMenuProps) {
  const router = useRouter();
  const t = useTranslations('Navigation'); // Or perhaps a common translations namespace

  const handleSendTo = (path: string) => {
    if (!content) return;
    // Encode the content in a URL query param 'input' or 'data'
    const encoded = encodeURIComponent(content);
    router.push(`${path}?input=${encoded}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('gap-1.5 h-9', className)}
          disabled={disabled || !content}
          title="Send to another tool"
        >
          <Send className="h-3.5 w-3.5" />
          Send To...
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {TARGET_TOOLS.map((tool) => (
          <DropdownMenuItem key={tool.id} onClick={() => handleSendTo(tool.path)}>
            {tool.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
