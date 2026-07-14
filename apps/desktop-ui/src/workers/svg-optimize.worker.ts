import { optimizeSvgMarkup } from '@/lib/svg-optimize';

export type SvgOptimizeRequest = {
  id: number;
  svg: string;
};

export type SvgOptimizeResponse =
  | { id: number; ok: true; data: string }
  | { id: number; ok: false; error: string };

self.onmessage = async (event: MessageEvent<SvgOptimizeRequest>) => {
  const { id, svg } = event.data;
  const result = await optimizeSvgMarkup(svg);
  const response: SvgOptimizeResponse = { id, ...result };
  self.postMessage(response);
};
