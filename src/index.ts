import dotenv from 'dotenv';
import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import morgan from 'morgan';
import { dataSource } from './data-source';
import http from 'http';
import cron from 'node-cron';

// Route Imports
import authRoute from './routes/authRoute';
import adminRoute from './routes/adminRoute';
import patientRoute from './routes/patientRoute';
import doctorRoute from './routes/doctorRoute';
import paymentRoute from './routes/paymentRoute';
import { getSocketIO } from './lib/socketIO';
import { SocketHandler } from './socketIO';
import { uploadRouter } from './routes/uploadsRoute';
import notificationRouter from './routes/notificationsRoute';
import AutoCloseConsultations from "./cron/autoCloseConsultations";
import AutoCancelAppointments from "./cron/autoCancelAppointments";
import { handleShutdowns, Logger } from './logger';

dotenv.config();

const PORT: number = Number(process.env.PORT) | 9000;
const logger = new Logger("MainAppService");

const app = express();

dataSource
  .initialize()
  .then(() => {
    logger.debug('Data source initialized...');

    // Middleware to log request details
    app.use((req, res, next) => {
      const start = process.hrtime();

      res.on('finish', () => {
        const [seconds, nanoseconds] = process.hrtime(start);
        const duration = (seconds * 1000 + nanoseconds / 1e6).toFixed(3); // in milliseconds
        const logMessage = `${req.method} ${req.originalUrl} ${res.statusCode} ${duration} ms - ${res.get('Content-Length') || 0}`;

        logger.info({
          message: logMessage,
          type: "service log"
        });
      });

      next();
    });

    // Endpoint to get server uptime
    app.get('/uptime', async (req, res) => {
      const uptime = process.uptime();
      const uptimeMessage = `${Math.floor(uptime / 60)} minutes, ${Math.floor(uptime % 60)} seconds`;
      res.json({ uptime: uptimeMessage });
    });


    // Middleware
    app.use(cors({
      origin: '*',
    }));
    app.use(morgan('dev'));
    app.use(express.json(), bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(cookieParser());

    // Routes
    app.use('/auth', authRoute);
    app.use('/admin', adminRoute);
    app.use('/patients', patientRoute);
    app.use('/doctors', doctorRoute);
    app.use('/payments', paymentRoute);
    app.use('/upload', uploadRouter) // new

    app.use('/notifications', notificationRouter);

    app.get('/', (req, res) => {
      res.send('Zomujo API');
    });

    const server = http.createServer(app);

    const io = getSocketIO(server);
    io.on("connection", SocketHandler);

    handleShutdowns(logger, server);

    server.listen(PORT, () => {
      logger.info({
        message: `Server is running on ${PORT}...`,
        type: "service log"
      });
    });

    cron.schedule('* * * * *', AutoCloseConsultations)
    cron.schedule('* * * * *', AutoCancelAppointments)
  })
  .catch((error) => {
    logger.error('Error during Data Source initialization:\n', error);
  });


