import { Sparkles, Workflow } from 'lucide-react';
import { Badge } from '../ui/Badge';

/**
 * Two kinds of guidance appear in the app and they are always labeled apart:
 * AI output (helpful, but can be wrong) and the adaptive engine's deterministic calculations.
 */
export function AiBadge({ label = 'AI-generated' }: { label?: string }) {
  return <Badge tone="ai" icon={<Sparkles aria-hidden />} title="Written by an AI model. Check it against the lesson.">{label}</Badge>;
}

export function SystemBadge({ label = 'Adaptive engine' }: { label?: string }) {
  return <Badge tone="neutral" icon={<Workflow aria-hidden />} title="Calculated from your answers by fixed, documented rules.">{label}</Badge>;
}
