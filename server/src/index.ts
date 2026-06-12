import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import fixedExpensesRoutes from './routes/fixedExpenses';
import dailyExpensesRoutes from './routes/dailyExpenses';
import statsRoutes from './routes/stats';
import adminRoutes from './routes/admin';
import categoriesRoutes from './routes/categories';
import recurringExpensesRoutes from './routes/recurringExpenses';
import insightsRoutes from './routes/insights';
import investmentsRoutes from './routes/investments';
import iolRoutes from './routes/iol';
import newsRoutes from './routes/news';
import apiTokensRoutes from './routes/apiTokens';
import bucketsRoutes from './routes/buckets';
import adjustmentsRoutes from './routes/adjustments';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? true
    : process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/fixed-expenses', fixedExpensesRoutes);
app.use('/api/daily-expenses', dailyExpensesRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/recurring-expenses', recurringExpensesRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/investments', investmentsRoutes);
app.use('/api/iol', iolRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/api-tokens', apiTokensRoutes);
app.use('/api/buckets', bucketsRoutes);
app.use('/api/adjustments', adjustmentsRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const clientPath = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientPath));
  app.use((_req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

export default app;
