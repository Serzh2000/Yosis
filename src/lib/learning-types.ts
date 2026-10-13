import type { CourseStep } from './learning-course';

/** Подсказка наставника, которая остаётся на экране, пока ученик исследует другую вкладку. */
export interface LearningGuide {
  title: string;
  tip: string;
}
/** Рабочая область, в которую шаг курса приглашает заглянуть. */
export type LearningWorkspace = NonNullable<CourseStep['workspace']>;
