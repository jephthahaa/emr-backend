import { Request, Response } from 'express';
import { dataSource } from '../data-source';
import { Notification, Notify } from '../models/notification';
import { COMPANY_NAME } from '../utils/constants';
import { mailer } from '../utils/mailer';
import { FutureVisits } from '../models/future-visits';
import { LessThanOrEqual } from 'typeorm';

let clients: Record<string, Response> = {};

const notificationRepository = dataSource.getRepository(Notification);
const futureVisitsRepository = dataSource.getRepository(FutureVisits);

export const initialise = async (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const userId = req["userId"];
    clients[userId] = res;
    const connectedNote: Notify = {
        receiverId: userId,
        payload: {
            message: "connected"
        }
    };
    await sendNotification(connectedNote);

    const notifications = await notificationRepository.find({
        where: { receiverId: userId }
    });

    notifications.forEach(async (note) => {
        await sendNotification(note);
        await notificationRepository.delete(note.id);
    });

    setInterval(async () => {
        const now = new Date();
        const futureVisits = await futureVisitsRepository.find();
        for (const visit of futureVisits) {
            if (isToday(visit.sendMessageAt)) {
                await processNotification([{
                    email: visit.consultation.patient.email,
                    topic: "Future Visit Reminder",
                    message: visit.message,
                    id: visit.consultation.patient.id
                }]);
            }
        }
    }, 3600000); // 1 hour

    req.on('close', () => {
        console.log('Client disconnected');
        delete clients[userId];
        res.end();
    });
}

export const sendNotification = async (notify: Notify) => {
    console.log('sending notification:', notify);
    const client = clients[notify.receiverId];
    if (client) {
        client.write(`data: ${JSON.stringify(notify)}\n\n`, async (err) => {
            if (err) {
                console.log('Error sending message:', err);
                const note = notificationRepository.create({ ...notify });
                await notificationRepository.save(note);
            }
        });
        return;
    }
    console.info("reciever not connected: saving notification");
    const note = notificationRepository.create({ ...notify });
    await notificationRepository.save(note);
}

export type ProcessNotifyProps = {
    email: string;
    topic: string;
    message: string;
    id?: string;
}
export const processNotification = async (props: ProcessNotifyProps[]): Promise<void> => {
    try {
        for (const prop of props) {
            // await mailer.sendMail({
            //     from: COMPANY_NAME,
            //     to: prop.email,
            //     subject: prop.topic,
            //     text: prop.message
            // });
            // mailer.on("error", error => {
            //     throw error;
            // });
            // await mailer.sendMail({
            //     from: COMPANY_NAME,
            //     to: prop.email,
            //     subject: prop.topic,
            //     text: prop.message
            // });
            // mailer.on("error", error => {
            //     throw error;
            // });

            // prop.id != null ? await sendNotification({
            //     receiverId: prop.id,
            //     payload: {
            //         message: prop.message,
            //         topic: prop.topic
            //     }
            // }) : "";
        }
    } catch (error) {
        throw error;
    }

}

const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
}