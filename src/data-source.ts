import "reflect-metadata";
import dotenv from 'dotenv';
import { DataSource } from "typeorm";
import path from 'path';

dotenv.config();

export const dataSource = new DataSource({
    type: "mysql",
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE,
    synchronize: true,
    logging: false,
    entities: [path.join(__dirname, 'models', '**', '*.{ts,js}')],
    migrations: [],
    subscribers: [],
});


