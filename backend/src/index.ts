import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import vehicleRoutes from './routes/vehicle';
import serviceRecordRoutes from './routes/serviceRecord';
import dashboardRoutes from './routes/dashboard';
import userRoutes from './routes/user';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({ 
  origin: (origin, callback) => {
    // Dynamically reflect the origin to prevent trailing-slash or subdomain mismatch issues on Render
    callback(null, origin || true);
  }, 
  credentials: true 
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/service-records', serviceRecordRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api', dashboardRoutes); // Alias for alerts endpoints (GET /api/alerts)
app.use('/api/users', userRoutes);

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
