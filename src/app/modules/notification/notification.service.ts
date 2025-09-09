import { JwtPayload } from 'jsonwebtoken';
import { INotification } from './notification.interface';
import { Notification } from './notification.model';
import QueryBuilder from '../../../shared/apiFeature';
import { query } from 'express';

// get notifications
const getNotificationFromDB = async (user: JwtPayload, query: Record<string, any>): Promise<{notifications: INotification[], pagination:any}> => {

    const result = new QueryBuilder(Notification.find({ receiver: user.id }), query).paginate();
    const notifications = await result.queryModel;
    const pagination = result.getPaginationInfo();

    return { notifications, pagination };
};

// read notifications only for user
const readNotificationToDB = async (user: JwtPayload): Promise<INotification | undefined> => {

    const result: any = await Notification.updateMany(
        { receiver: user.id, read: false },
        { $set: { read: true } }
    );
    return result;
};

// get notifications for admin
const adminNotificationFromDB = async () => {
    const result = await Notification.find({ type: 'ADMIN' });
    const pagination = new QueryBuilder(Notification.find({ type: 'ADMIN' }), query).paginate();
    return { result, pagination };
};

// read notifications only for admin
const adminReadNotificationToDB = async (): Promise<INotification | null> => {
    const result: any = await Notification.updateMany(
        { type: 'ADMIN', read: false },
        { $set: { read: true } },
        { new: true }
    );
    return result;
};

export const NotificationService = {
    adminNotificationFromDB,
    getNotificationFromDB,
    readNotificationToDB,
    adminReadNotificationToDB
};
