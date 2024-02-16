// app.js

const express = require('express')
const sqlite3 = require('sqlite3')
const {open} = require('sqlite')
const path = require('path')

const app = express()

const dbPath = path.join(__dirname, 'todoApplication.db')

const initializeDBAndServer = async () => {
  try {
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })

    await db.exec(`
      CREATE TABLE IF NOT EXISTS todo (
        id INTEGER PRIMARY KEY,
        todo TEXT,
        priority TEXT,
        status TEXT
      );
    `)

    app.listen(3000, () => {
      console.log('Server is running on http://localhost:3000')
    })
  } catch (error) {
    console.error(`DB Error: ${error.message}`)
    process.exit(1)
  }
}

initializeDBAndServer()

app.use(express.json())

// API 1: GET request to retrieve todos based on status, priority, or search query
app.get('/todos/', async (request, response) => {
  try {
    const {status, priority, search_q} = request.query
    let query = 'SELECT * FROM todo'

    if (status) {
      query += ` WHERE status='${status}'`
    } else if (priority) {
      query += ` WHERE priority='${priority}'`
    } else if (status && priority) {
      query += ` WHERE status='${status}' AND priority='${priority}'`
    } else if (search_q) {
      query += ` WHERE todo LIKE '%${search_q}%'`
    }

    const db = await open({filename: dbPath, driver: sqlite3.Database})
    const todos = await db.all(query)
    response.json(todos)
  } catch (error) {
    response.status(500).json({error: error.message})
  }
})

// API 2: GET request to retrieve a specific todo by ID
app.get('/todos/:todoId/', async (request, response) => {
  try {
    const {todoId} = request.params
    const db = await open({filename: dbPath, driver: sqlite3.Database})
    const todo = await db.get('SELECT * FROM todo WHERE id = ?', [todoId])
    if (!todo) {
      response.status(404).json({error: 'Todo not found'})
    } else {
      response.json(todo)
    }
  } catch (error) {
    response.status(500).json({error: error.message})
  }
})

// API 3: POST request to add a new todo
app.post('/todos/', async (request, response) => {
  try {
    const {todo, priority, status} = request.body
    const db = await open({filename: dbPath, driver: sqlite3.Database})
    await db.run('INSERT INTO todo (todo, priority, status) VALUES (?, ?, ?)', [
      todo,
      priority,
      status,
    ])
    response.send('Todo Successfully Added')
  } catch (error) {
    response.status(500).json({error: error.message})
  }
})

// API 4: PUT request to update a todo by ID
app.put('/todos/:todoId/', async (request, response) => {
  try {
    const {todoId} = request.params
    const {todo, priority, status} = request.body
    const db = await open({filename: dbPath, driver: sqlite3.Database})
    const updateFields = []
    const updateValues = []

    if (todo) {
      updateFields.push('todo = ?')
      updateValues.push(todo)
    }
    if (priority) {
      updateFields.push('priority = ?')
      updateValues.push(priority)
    }
    if (status) {
      updateFields.push('status = ?')
      updateValues.push(status)
    }

    if (updateFields.length === 0) {
      return response.status(400).send('No fields to update')
    }

    updateValues.push(todoId)
    await db.run(
      `UPDATE todo SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues,
    )

    // Send appropriate response based on the updated field
    if (status) {
      response.send('Status Updated')
    } else if (priority) {
      response.send('Priority Updated')
    } else if (todo) {
      response.send('Todo Updated')
    }
  } catch (error) {
    response.status(500).json({error: error.message})
  }
})

// API 5: DELETE request to delete a todo by ID
app.delete('/todos/:todoId/', async (request, response) => {
  try {
    const {todoId} = request.params
    const db = await open({filename: dbPath, driver: sqlite3.Database})
    await db.run('DELETE FROM todo WHERE id = ?', [todoId])
    response.send('Todo Deleted')
  } catch (error) {
    response.status(500).json({error: error.message})
  }
})

module.exports = app
