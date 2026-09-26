import { getDatabase } from './database';
import { Project, ProjectCreateInput } from '../types';

export class ProjectRepository {
  async getAll(): Promise<Project[]> {
    const db = await getDatabase();
    return db.getAll('projects');
  }

  async getById(id: string): Promise<Project | undefined> {
    const db = await getDatabase();
    return db.get('projects', id);
  }

  async create(input: ProjectCreateInput): Promise<Project> {
    const db = await getDatabase();
    const id = input.id || `proj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newProject: Project = {
      ...input,
      id,
      color: input.color || '#6366f1',
      createdAt: new Date().toISOString(),
    };
    await db.put('projects', newProject);
    return newProject;
  }

  async update(project: Project): Promise<Project> {
    const db = await getDatabase();
    await db.put('projects', project);
    return project;
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    // Cannot delete default inbox project
    const project = await db.get('projects', id);
    if (project?.isDefault) {
      throw new Error('Cannot delete default system project');
    }

    const tx = db.transaction(['projects', 'tasks'], 'readwrite');
    // Reassign tasks from this project to inbox
    const tasksStore = tx.objectStore('tasks');
    const projectIndex = tasksStore.index('by-projectId');
    const tasks = await projectIndex.getAll(id);
    for (const task of tasks) {
      task.projectId = 'inbox';
      task.updatedAt = new Date().toISOString();
      await tasksStore.put(task);
    }
    await tx.objectStore('projects').delete(id);
    await tx.done;
  }
}

export const projectRepository = new ProjectRepository();
