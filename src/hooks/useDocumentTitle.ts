import { useEffect } from 'react';

export function useDocumentTitle(title: string | null) {
  useEffect(() => {
    document.title = title ? `${title} · GapLearning` : 'GapLearning · Find and close your knowledge gaps';
  }, [title]);
}
