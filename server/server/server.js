const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { connectDB, getDbStatus } = require('./config/db');
const User = require('./models/User');

dotenv.config();
connectDB();

const ensureDevelopmentAdmin = async () => {
  if (process.env.NODE_ENV !== 'development') return;

  const email = process.env.DEMO_ADMIN_EMAIL || 'admin@medreprolab.ai';
  const password = process.env.DEMO_ADMIN_PASSWORD || 'Admin@1234';

  try {
    const existingAdmin = await User.findOne({ email });
    if (!existingAdmin) {
      await User.create({
        name: 'MedReproLab Admin',
        email,
        password,
        institution: 'MedReproLab Review Board',
        role: 'admin',
      });
      console.log(`Admin demo login created: ${email} / ${password}`);
    }
  } catch (error) {
    console.error('Failed to ensure demo admin:', error.message);
  }
};

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/datasets', require('./routes/datasetRoutes'));
app.use('/api/experiments', require('./routes/experimentRoutes'));
app.use('/api/activities', require('./routes/activityRoutes'));
app.use('/api/review-requests', require('./routes/reviewRequestRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));

app.get('/api/health', (req, res) => {
  const database = getDbStatus();
  res.status(database.connected ? 200 : 503).json({
    status: database.connected ? 'OK' : 'DEGRADED',
    message: 'MedReproLab API is running',
    database,
  });
});

app.get('/api/db/status', (req, res) => {
  const database = getDbStatus();
  res.status(database.connected ? 200 : 503).json(database);
});

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`MedReproLab Server running on http://localhost:${PORT}`);
  ensureDevelopmentAdmin();
});

const adminApp = express();
const adminPanelPath = path.join(__dirname, 'admin-panel');
adminApp.use(express.static(adminPanelPath));
adminApp.get('*', (req, res) => {
  res.sendFile(path.join(adminPanelPath, 'index.html'));
});

const ADMIN_PORT = process.env.ADMIN_PORT || Number(PORT) + 100;
adminApp.listen(ADMIN_PORT, () => {
  console.log(`MedReproLab Admin Panel running on http://localhost:${ADMIN_PORT}`);
});
