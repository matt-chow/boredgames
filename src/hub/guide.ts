/** A game's help, as data so it can be searched and tested. `**bold**` is the only inline markup. */
export type GuideBlock = string | { ul: string[] } | { ol: string[] } | { example: string; steps: string[] };

export interface GuideSection {
  /** Stable id: contextual help links open a guide at one of these. */
  id: string;
  title: string;
  body: GuideBlock[];
}

export interface GuideLevel {
  id: 'quick' | 'full' | 'rules';
  title: string;
  sections: GuideSection[];
}

export interface GuideDoc {
  title: string;
  levels: GuideLevel[];
}

export function blockText(b: GuideBlock): string {
  if (typeof b === 'string') return b;
  if ('ul' in b) return b.ul.join(' ');
  if ('ol' in b) return b.ol.join(' ');
  return `${b.example} ${b.steps.join(' ')}`;
}

/** The sections matching every word of a search, in guide order. */
export function searchGuide(doc: GuideDoc, query: string): { level: GuideLevel; section: GuideSection }[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return doc.levels.flatMap((level) =>
    level.sections
      .filter((section) => {
        const text = `${section.title} ${section.body.map(blockText).join(' ')}`.replaceAll('**', '').toLowerCase();
        return words.every((w) => text.includes(w));
      })
      .map((section) => ({ level, section })),
  );
}
