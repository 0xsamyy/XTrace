import express from 'express';
import pino from 'pino';
import cors from 'cors';
import blueprintRoutes from './routes/blueprintRoutes.js';
import { config } from './config/env.js';

const app = express();
const logger = pino({ name: 'xtrace-backend' });

app.use(cors());
app.use(express.json());
app.use('/api', blueprintRoutes);

app.get('/health', (_req, res) => res.status(200).send('ok'));

app.listen(config.port, () => {
  logger.info(`Server listening on http://localhost:${config.port}`);
});
