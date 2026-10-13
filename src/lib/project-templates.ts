import type { Project } from '../../shared/types';
import { examples } from './examples';
import { cloneProject, validateProject } from './projects';

export type ProjectTemplate = 'blank' | 'logic' | 'counter';
export function createProject(name: string, template: ProjectTemplate): Project {
  const source = cloneProject(
    examples.find((example) => example.id === (template === 'blank' ? 'button' : template))!
      .project,
  );
  source.name = name;
  return validateProject(source);
}
