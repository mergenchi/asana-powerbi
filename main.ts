import express from 'express';
import asana from 'asana';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const client = asana.Client.create().useAccessToken(process.env.POWERBI_TOKEN || 'forTS');

interface Task {
  id: string;
  name: string;
  parent: string | null;
  createdAt: string;
  completedAt: string | null;
  section: (string | undefined)[] | null;
  assignee: string | null;
  tags: string[];
  projects: string[];
  cost?: number | null;
  actualCost?: number | null;
}

app.get('/project/:projectId', async (req, res) => {
  try {
    const projectId = req.params.projectId;

    const tasks = await client.tasks.findByProject(projectId);

    const tasksWithSubtasks: Task[] = [];
    for (const taskf of tasks.data) {
      const task = await client.tasks.getTask(taskf.gid);

      const taskWithSubtasks: Task = {
        id: task.gid,
        name: task.name,
        parent: task.parent ? task.parent.gid : null,
        section: task.memberships ? task.memberships.map((mem) => mem.section?.name) : null,
        createdAt: task.created_at,
        completedAt: task.completed_at,
        assignee: task.assignee ? task.assignee.name : null,
        tags: task.tags ? task.tags.map((tag) => tag.name) : [],
        projects: task.projects ? task.projects.map((project) => project.name) : [],
        cost: task.custom_fields
          ? task.custom_fields.filter((field) => field.name === 'Cost').map((e) => e.number_value)[0]
          : null,
        actualCost: task.custom_fields
          ? task.custom_fields.filter((field) => field.name === 'Actual cost').map((e) => e.number_value)[0]
          : null,
      };
      tasksWithSubtasks.push(taskWithSubtasks);

      const subtasks = await client.tasks.subtasks(task.gid);
      for (const subtask of subtasks.data) {
        const subtaskWithParent: Task = {
          id: subtask.gid,
          name: subtask.name,
          parent: task.gid,
          createdAt: subtask.created_at,
          completedAt: subtask.completed_at,
          section: task.memberships ? task.memberships.map((mem) => mem.section?.name) : null,
          assignee: subtask.assignee ? subtask.assignee.name : null,
          tags: subtask.tags ? subtask.tags.map((tag) => tag.name) : [],
          projects: subtask.projects ? subtask.projects.map((project) => project.name) : [],
          cost: task.custom_fields
            ? task.custom_fields.filter((field) => field.name === 'Cost').map((e) => e.number_value)[0]
            : null,
          actualCost: task.custom_fields
            ? task.custom_fields.filter((field) => field.name === 'Actual cost').map((e) => e.number_value)[0]
            : null,
        };
        tasksWithSubtasks.push(subtaskWithParent);
      }
    }

    res.json(tasksWithSubtasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed' });
  }
});

app.listen(3000, '0.0.0.0');
