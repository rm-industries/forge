export interface Article {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  draft: boolean;
  paragraphs: readonly string[];
}

const articles = Object.freeze<Article[]>([
  {
    slug: 'designing-a-calm-starting-point',
    title: 'Designing a calm starting point',
    description: 'How a small set of deliberate defaults can leave room for a site to develop its own identity.',
    publishedAt: '2026-03-14',
    draft: false,
    paragraphs: [
      'A useful starter should make the first page feel considered without deciding what every future page must become.',
      'Begin with a clear hierarchy, dependable spacing, and components that can be replaced one at a time. The result is easier to understand and safer to customize.',
    ],
  },
  {
    slug: 'content-that-travels-well',
    title: 'Content that travels well',
    description: 'A practical case for keeping example content portable, structured, and easy to replace.',
    publishedAt: '2026-02-21',
    draft: false,
    paragraphs: [
      'Portable content starts with a small contract: a stable slug, a useful summary, a publication date, and the text readers came to find.',
      'Keeping the example data separate from route rendering makes the eventual move to a content system explicit instead of accidental.',
    ],
  },
  {
    slug: 'accessible-by-default',
    title: 'Accessible by default',
    description:
      'Why landmarks, focus behavior, and readable metadata belong in the foundation rather than a final pass.',
    publishedAt: '2026-01-30',
    draft: false,
    paragraphs: [
      'Accessibility is most dependable when it is part of the page structure. Semantic landmarks and visible focus states then benefit every route automatically.',
      'Automated checks do not replace thoughtful review, but they protect the baseline while the site grows and changes hands.',
    ],
  },
  {
    slug: 'future-draft',
    title: 'A future draft',
    description: 'An unpublished entry used to prove production filtering.',
    publishedAt: '2027-01-01',
    draft: true,
    paragraphs: [
      'This draft is available to local development but must never be emitted by a production build or feed.',
    ],
  },
]);

export const getArticles = ({ includeDrafts = false }: { includeDrafts?: boolean } = {}): readonly Article[] =>
  articles
    .filter(({ draft }) => includeDrafts || !draft)
    .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));

export const getArticleNeighbors = (slug: string, entries: readonly Article[]) => {
  const index = entries.findIndex((entry) => entry.slug === slug);

  if (index < 0) return {};

  return {
    previous: entries[index + 1],
    next: entries[index - 1],
  };
};
