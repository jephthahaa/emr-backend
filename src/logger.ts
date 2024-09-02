import * as winston from 'winston';
import http from "http";
import { LogType } from './utils/log.type';

const { align, colorize, combine, timestamp, json, printf, errors } = winston.format;

export class Logger {
    public logger: winston.Logger;
    private endpoint: string = "AppEndpoint";

    constructor(context?: string) {
        this.logger = winston.createLogger({
            level: process.env.LOG_LEVEL || "info",
            defaultMeta: {
                service: context || "AppService",
                endpoint: this.endpoint,
            },
            format: combine(
                errors({ stack: true }),
                timestamp({
                    format: "YYY-MM-DD hh:mm:ss.SSS A",
                }),
                align(),
                json(),
            ),
            transports: [
                new winston.transports.Console({
                    format: combine(
                        errors({ stack: true }),
                        colorize({ all: true }),
                        timestamp({
                            format: "YYYY-MM-DD hh:mm:ss.SSS A",
                        }),
                        align(),
                        printf((info: any) =>
                            `[${info.timestamp}] [${context}] ${info.level}: ${info.message}`)
                    ),
                }),
                new winston.transports.File({
                    filename: "logs/combined.log",
                }),
                new winston.transports.File({
                    filename: "logs/errors.log",
                    level: "error",
                    format: combine(
                        errors({ stack: true }),
                        errorFilter(),
                        timestamp({
                            format: "YYYY-MM-DD hh:mm:ss.SSS A",
                        }),
                        json()
                    ),
                }),
                new winston.transports.File({
                    filename: "logs/warns.log",
                    level: "warn",
                    format: combine(
                        errors({ stack: true }),
                        warnFilter(),
                        timestamp({
                            format: "YYYY-MM-DD hh:mm:ss.SSS A",
                        }),
                        json()
                    ),
                }),
                new winston.transports.File({
                    filename: "logs/infos.log",
                    level: "info",
                    format: combine(
                        errors({ stack: true }),
                        infoFilter(),
                        timestamp({
                            format: "YYYY-MM-DD hh:mm:ss.SSS A",
                        }),
                        json()
                    ),
                }),
            ],
        });
    }

    public info(message: LogProps): void {
        this.logger.info(message);
    }

    public error(message: string | LogProps, trace?: string): void {
        this.logger.error(message.toString(), { trace });
    }

    public warn(message: string): void {
        this.logger.warn(message);
    }

    public debug(message: string): void {
        this.logger.debug(message);
    }

    public setEndpoint(endpointName: string): void {
        this.endpoint = endpointName;
    }


}

const errorFilter = winston.format((info, opts) => {
    return info.level === "error" ? info : false
});

const warnFilter = winston.format((info, opts) => {
    return info.level === "warn" ? info : false;
});

const infoFilter = winston.format((info, opts) => {
    return info.level === "info" ? info : false;
});



export type LogProps = {
    endpoint?: string;
    level?: string;
    service?: string;
    timestamp?: Date,
    type: LogType;
    userId?: string;
    message: string;
}

export const handleShutdowns = (logger: Logger, server: http.Server) => {

    // Handle uncaught exceptions and unhandled rejections
    process.on('uncaughtException', (error) => {
        logger.logger.error(`Uncaught Exception: ${error.message}`, { error });
        process.exit(1); // Exit process
    });

    process.on('unhandledRejection', (reason, promise) => {
        logger.logger.error(`Unhandled Rejection: ${reason}`, { promise });
        process.exit(1); // Exit process
    });

    process.on('exit', (code) => {
        const uptime = process.uptime();
        const uptimeMessage = `${Math.floor(uptime / 60)} minutes, ${Math.floor(uptime % 60)} seconds`;
        logger.info({ message: `Server is shutting down with exit code ${code}: uptime: ${uptimeMessage}`, type: "service log" });
    });

    // Handle graceful shutdown for server
    const gracefulShutdown = () => {
        logger.debug('Shutting down gracefully...');

        const uptime = process.uptime();
        const uptimeMessage = `${Math.floor(uptime / 60)} minutes, ${Math.floor(uptime % 60)} seconds`;
        logger.info({
            message: `Uptime before server down: ${uptimeMessage}`,
            type: "service log"
        });
        server.close(() => {
            logger.debug('Closed out remaining connections.');
            process.exit(0);
        });

        // Forcefully close after 10 seconds
        setTimeout(() => {
            logger.error('Could not close connections in time, forcefully shutting down');
            process.exit(1);
        }, 10000);
    };

    process.on('SIGINT', gracefulShutdown); // Ctrl+C
    process.on('SIGTERM', gracefulShutdown); // kill command
}