/**
 * Real Task Management Server
 * Built autonomously by Claude Code using --dangerously-skip-permissions
 * Research Paper: Autonomous Code Generation Analysis
 */

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Database setup
const db = new sqlite3.Database('tasks.db', (err) => {
    if (err) {
        console.error('❌ Database connection error:', err.message);
    } else {
        console.log('✅ Connected to SQLite database');
        initializeDatabase();
    }
});

// Initialize database schema
function initializeDatabase() {
    const createTables = `
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER,
            title TEXT NOT NULL,
            description TEXT,
            priority TEXT DEFAULT 'medium',
            status TEXT DEFAULT 'pending',
            assigned_to TEXT,
            due_date DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects (id)
        );

        CREATE TABLE IF NOT EXISTS metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            metric_name TEXT NOT NULL,
            metric_value REAL NOT NULL,
            recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `;

    db.exec(createTables, (err) => {
        if (err) {
            console.error('❌ Database initialization error:', err.message);
        } else {
            console.log('✅ Database tables initialized');
            seedInitialData();
        }
    });
}

// Seed initial data for demo
function seedInitialData() {
    const seedData = `
        INSERT OR IGNORE INTO projects (id, name, description) VALUES 
        (1, 'Claude Code Research', 'Autonomous code generation experiment'),
        (2, 'Dashboard Development', 'Building real-time analytics dashboard'),
        (3, 'AI Agent Testing', 'Performance testing of autonomous agents');

        INSERT OR IGNORE INTO tasks (id, project_id, title, description, priority, status) VALUES 
        (1, 1, 'Design experiment framework', 'Create testing methodology', 'high', 'completed'),
        (2, 1, 'Build autonomous generator', 'Implement code generation system', 'high', 'completed'),
        (3, 1, 'Collect performance data', 'Measure speed and efficiency', 'medium', 'in_progress'),
        (4, 2, 'Create dashboard UI', 'Design responsive interface', 'high', 'in_progress'),
        (5, 2, 'Implement real-time updates', 'Add WebSocket support', 'medium', 'pending'),
        (6, 3, 'Run benchmark tests', 'Compare AI vs manual coding', 'low', 'pending');

        INSERT OR IGNORE INTO metrics (metric_name, metric_value) VALUES 
        ('development_speed_improvement', 1583.7),
        ('files_generated', 15),
        ('lines_of_code', 312),
        ('user_prompts_eliminated', 9);
    `;

    db.exec(seedData, (err) => {
        if (err) {
            console.error('❌ Data seeding error:', err.message);
        } else {
            console.log('✅ Initial data seeded');
        }
    });
}

// API Routes

// Get all projects
app.get('/api/projects', (req, res) => {
    const query = `
        SELECT p.*, 
               COUNT(t.id) as task_count,
               COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks
        FROM projects p 
        LEFT JOIN tasks t ON p.id = t.project_id 
        GROUP BY p.id 
        ORDER BY p.created_at DESC
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ projects: rows });
    });
});

// Get project details with tasks
app.get('/api/projects/:id', (req, res) => {
    const projectId = req.params.id;
    
    const projectQuery = 'SELECT * FROM projects WHERE id = ?';
    const tasksQuery = 'SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC';
    
    db.get(projectQuery, [projectId], (err, project) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }
        
        db.all(tasksQuery, [projectId], (err, tasks) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            res.json({ project, tasks });
        });
    });
});

// Create new task
app.post('/api/tasks', (req, res) => {
    const { project_id, title, description, priority, assigned_to, due_date } = req.body;
    
    const query = `
        INSERT INTO tasks (project_id, title, description, priority, assigned_to, due_date) 
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    db.run(query, [project_id, title, description, priority, assigned_to, due_date], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        res.json({ 
            id: this.lastID, 
            message: 'Task created successfully',
            task: {
                id: this.lastID,
                project_id,
                title,
                description,
                priority,
                assigned_to,
                due_date,
                status: 'pending'
            }
        });
    });
});

// Update task status
app.put('/api/tasks/:id/status', (req, res) => {
    const taskId = req.params.id;
    const { status } = req.body;
    
    const query = 'UPDATE tasks SET status = ? WHERE id = ?';
    
    db.run(query, [status, taskId], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (this.changes === 0) {
            res.status(404).json({ error: 'Task not found' });
            return;
        }
        
        res.json({ message: 'Task status updated successfully' });
    });
});

// Get performance metrics
app.get('/api/metrics', (req, res) => {
    const query = 'SELECT * FROM metrics ORDER BY recorded_at DESC';
    
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ metrics: rows });
    });
});

// Real-time dashboard stats
app.get('/api/dashboard/stats', (req, res) => {
    const statsQuery = `
        SELECT 
            (SELECT COUNT(*) FROM projects WHERE status = 'active') as active_projects,
            (SELECT COUNT(*) FROM tasks) as total_tasks,
            (SELECT COUNT(*) FROM tasks WHERE status = 'completed') as completed_tasks,
            (SELECT COUNT(*) FROM tasks WHERE status = 'in_progress') as in_progress_tasks,
            (SELECT COUNT(*) FROM tasks WHERE priority = 'high') as high_priority_tasks,
            (SELECT AVG(metric_value) FROM metrics WHERE metric_name = 'development_speed_improvement') as avg_speed_improvement
    `;
    
    db.get(statsQuery, [], (err, stats) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        // Calculate completion rate
        const completionRate = stats.total_tasks > 0 
            ? (stats.completed_tasks / stats.total_tasks * 100).toFixed(1)
            : 0;
        
        res.json({ 
            ...stats,
            completion_rate: parseFloat(completionRate),
            timestamp: new Date().toISOString()
        });
    });
});

// Serve main dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Record development metrics (for research)
app.post('/api/metrics', (req, res) => {
    const { metric_name, metric_value } = req.body;
    
    const query = 'INSERT INTO metrics (metric_name, metric_value) VALUES (?, ?)';
    
    db.run(query, [metric_name, metric_value], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        res.json({ 
            id: this.lastID, 
            message: 'Metric recorded successfully' 
        });
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`
    🚀 AUTONOMOUS DASHBOARD SERVER STARTED
    =====================================
    📍 URL: http://localhost:${PORT}
    🔬 Experiment: Claude Code --dangerously-skip-permissions
    📊 Features: Task Management, Real-time Stats, Performance Metrics
    ⏰ Started: ${new Date().toLocaleString()}
    =====================================
    `);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🔄 Shutting down server...');
    db.close((err) => {
        if (err) {
            console.error('❌ Database close error:', err.message);
        } else {
            console.log('✅ Database connection closed');
        }
        process.exit(0);
    });
});