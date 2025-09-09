import { INotification } from "../app/modules/notification/notification.interface";
import { Notification } from "../app/modules/notification/notification.model";
import { User } from "../app/modules/user/user.model";
import { firebaseHelper } from "../shared/firebaseHelper";


export const sendNotifications = async (data: any): Promise<INotification> => {

    const result = await Notification.create(data);

    const user = await User.findById(data?.receiver);

    if (user?.deviceToken) {
        const message = {
            notification: {
                title: 'New Notification Received',
                body: data?.text
            },
            token: user?.deviceToken,
        };
        //firebase
        firebaseHelper.sendPushNotification(message);
    }

    //@ts-ignore
    const socketIo = global.io;

    if (socketIo) {
        socketIo.emit(`get-notification::${data?.receiver}`, result);
    }

    return result;
}