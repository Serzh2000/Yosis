import type { Example } from './examples';
import {
  compareCurriculumExamples,
  curriculumTopics,
  getExampleLesson,
  type CurriculumLevel,
  type CurriculumTopic,
} from './example-curriculum';

export interface CatalogFilter {
  query?: string;
  level?: CurriculumLevel | 'all';
  topic?: CurriculumTopic | 'all';
}
const normalize = (text: string) => text.toLocaleLowerCase('ru').replaceAll('ё', 'е');

/** Search the learning goal as well as the title; combine level and topic. */
export function filterExampleCatalog(
  collection: readonly Example[],
  filter: CatalogFilter,
): Example[] {
  const terms = normalize(filter.query?.trim() ?? '')
    .split(/\s+/)
    .filter(Boolean);
  return collection
    .filter((example) => {
      const lesson = getExampleLesson(example.id);
      if (!lesson) return false;
      if (filter.level && filter.level !== 'all' && lesson.level !== filter.level) return false;
      if (filter.topic && filter.topic !== 'all' && lesson.topic !== filter.topic) return false;
      const topic = curriculumTopics.find((item) => item.id === lesson.topic);
      const searchable = normalize(
        [
          example.id,
          example.title,
          example.description,
          lesson.objective,
          lesson.observe,
          lesson.experiment,
          topic?.title,
          topic?.description,
        ].join(' '),
      );
      return terms.every((term) => searchable.includes(term));
    })
    .sort(compareCurriculumExamples);
}
