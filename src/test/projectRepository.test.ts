import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { projectRepository } from '../db/projectRepository';
import { taskRepository } from '../db/taskRepository';
import { closeDatabase, DB_NAME } from '../db/database';

describe('ProjectRepository', () => {
  beforeEach(async () => {
    closeDatabase();
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase(DB_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });

  afterEach(() => {
    closeDatabase();
  });

  it('creates and retrieves a new custom project', async () => {
    const project = await projectRepository.create({
      name: 'Side Project',
      color: '#ec4899',
      isDefault: false,
    });

    expect(project.id).toBeDefined();
    expect(project.name).toBe('Side Project');
    expect(project.color).toBe('#ec4899');
    expect(project.createdAt).toBeDefined();

    const fetched = await projectRepository.getById(project.id);
    expect(fetched).toEqual(project);

    const all = await projectRepository.getAll();
    expect(all).toHaveLength(1);
  });

  it('prevents deleting a default project', async () => {
    const defaultProject = await projectRepository.create({
      id: 'inbox',
      name: 'Inbox',
      color: '#6366f1',
      isDefault: true,
    });

    await expect(projectRepository.delete(defaultProject.id)).rejects.toThrow(
      'Cannot delete default system project'
    );
  });

  it('deletes custom project and reassigns its tasks to inbox', async () => {
    const customProject = await projectRepository.create({
      name: 'Temp Project',
      color: '#3b82f6',
      isDefault: false,
    });

    const task1 = await taskRepository.create({
      title: 'Project specific task',
      projectId: customProject.id,
    });

    expect(task1.projectId).toBe(customProject.id);

    await projectRepository.delete(customProject.id);

    // Project is removed
    const fetchedProj = await projectRepository.getById(customProject.id);
    expect(fetchedProj).toBeUndefined();

    // Task is reassigned to inbox
    const reassignedTask = await taskRepository.getById(task1.id);
    expect(reassignedTask?.projectId).toBe('inbox');
  });
});
