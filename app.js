const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const port = 3000;
const usersFilePath = path.join(__dirname, 'data', 'users.json');
const tasksFilePath = path.join(__dirname, 'data', 'tasks.json');

app.use(cors());
app.use(express.json());

// POST http://localhost:3000/login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const fileContent = await fs.readFile(usersFilePath, 'utf-8');
    const users = JSON.parse(fileContent);

    const user = users.find(
      (u) => u.email === email && u.password === password
    );

    if (user) {
      res.status(200).json({ result: 200, message: 'Login successful', userId: user.userid });
    } else {
      res.status(401).json({ result: 401, error: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Error reading users file:', error);
    res.status(500).json({ result: 500, error: 'Login failed due to server error' });
  }
});

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

// GET http://localhost:3000/users/:userid/tasks
app.get('/users/:userid/tasks', async (req, res) => {
    const userId = req.params.userid;
    const tasks = await readTasks();
    const userTasks = tasks.filter(task => task.userid === userId);
  
    if (userTasks.length > 0) {
      res.status(200).json({ 
        result: 200,
        message: 'Tasks retrieved successfully',
        data: userTasks
      });
    } else {
      res.status(200).json({
        result: 200,
        message: 'No tasks found for this user',
        data: []
      });
    }
  });

// POST http://localhost:3000/users/:userid/tasks/:taskid
app.post('/users/:userid/tasks', async (req, res) => {
  const userId = req.params.userid;
  const newTaskData = req.body;
  const tasks = await readTasks();

  if (!newTaskData.task || !newTaskData.description) {
    return res.status(400).json({ error: 'Task and description are required' });
  }

  const userTasks = tasks.filter(task => task.userid === userId);
  let newTaskNumber = 1;
  if (userTasks.length > 0) {
    const lastTaskId = userTasks.reduce((maxId, task) => {
      const num = parseInt(task.taskid.replace('T', ''), 10);
      return num > maxId ? num : maxId;
    }, 0);
    newTaskNumber = lastTaskId + 1;
  }
  const newTaskid = `T${String(newTaskNumber).padStart(3, '0')}`;

  const newTask = {
    userid: userId,
    taskid: newTaskid,
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

// PUT http://localhost:3000//users/:userid/tasks/:taskid
app.put('/users/:userid/tasks/:taskid', async (req, res) => {
  const userId = req.params.userid;
  const taskId = req.params.taskid;
  const updatedTaskData = req.body;
  const tasks = await readTasks();

  const taskIndex = tasks.findIndex(
    task => task.userid === userId && task.taskid === taskId
  );

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

// DELETE http://localhost:3000/users/:userid/tasks/:taskid
app.delete('/users/:userid/tasks/:taskid', async (req, res) => {
  const userId = req.params.userid;
  const taskId = req.params.taskid;
  const tasks = await readTasks();

  const initialLength = tasks.length;
  const updatedTasks = tasks.filter(
    task => !(task.userid === userId && task.taskid === taskId)
  );

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