const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = 3000;
const tasksFilePath = path.join(__dirname, 'data', 'tasks.json');

app.use(cors());
app.use(express.json());

// Method to read tasks.json
async function readTasks() {
  try {
    const fileContent = await fs.readFile(tasksFilePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('Error reading tasks file:', error);
    return [];
  }
}

// Method to update tasks.json
async function writeTasks(tasks) {
  try {
    const updatedJsonString = JSON.stringify(tasks, null, 2);
    await fs.writeFile(tasksFilePath, updatedJsonString, 'utf-8');
    return true;
  } catch (error) {
    console.error('Error writing tasks file:', error);
    return false;
  }
}

// GET http://localhost:3000/tasks
app.get('/tasks', async (req, res) => {
  const tasks = await readTasks();
  res.status(200).json({
    result: 200,
    message: 'Tasks retrieved successfully',
    data: tasks
  });
});

// POST http://localhost:3000/tasks
app.post('/tasks', async (req, res) => {
  const newTaskData = req.body;
  const tasks = await readTasks();

  if (!newTaskData.task || !newTaskData.description) {
    return res.status(400).json({ error: 'Task and description are required' });
  }

  const newTask = {
    taskid: uuidv4(),
    ...newTaskData,
    status: newTaskData.status === undefined ? false : newTaskData.status,
  };

  tasks.push(newTask);
  const success = await writeTasks(tasks);
  if (success) {
    res.status(201).json({
      result: 200,
      message: 'Task added successfully',
      data: newTask
    });
  } else {
    res.status(500).json({ error: 'Failed to add new task' });
  }
});

// PUT http://localhost:3000/tasks/:taskId
app.put('/tasks/:taskId', async (req, res) => {
  const taskIdToUpdate = req.params.taskId; 
  const updatedTaskData = req.body;
  const tasks = await readTasks();

  const taskIndex = tasks.findIndex(task => task.taskid === taskIdToUpdate);

  if (taskIndex === -1) {
    return res.status(404).json({ result: 404, error: 'Task not found' });
  }

  tasks[taskIndex] = { ...tasks[taskIndex], ...updatedTaskData };
  const success = await writeTasks(tasks);
  if (success) {
    res.status(200).json({
      result: 200,
      message: 'Task updated successfully',
      data: tasks[taskIndex]
    });
  } else {
    res.status(500).json({
      result: 500,
      error: 'Failed to update task'
    });
  }
});

// DELETE http://localhost:3000/tasks/:taskId
app.delete('/tasks/:taskId', async (req, res) => {
  const taskIdToDelete = req.params.taskId;
  const tasks = await readTasks();

  const initialLength = tasks.length;
  const updatedTasks = tasks.filter(task => task.taskid !== taskIdToDelete);

  if (updatedTasks.length === initialLength) {
    return res.status(404).json({
      result: 404,
      error: 'Task not found'
    });
  }

  const success = await writeTasks(updatedTasks);
  if (success) {
    res.status(200).json({
      result: 200,
      message: 'Task deleted successfully'
    });
  } else {
    res.status(500).json({
      result: 500,
      error: 'Failed to delete task'
    });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});