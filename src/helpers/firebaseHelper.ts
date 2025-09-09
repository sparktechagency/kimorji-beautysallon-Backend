// import admin from 'firebase-admin';
// // import serviceAccount from "../../src/firebaseSDK.json";
// import { logger } from '../shared/logger';

// // Cast serviceAccount to ServiceAccount type
// const serviceAccountKey: admin.ServiceAccount = serviceAccount as admin.ServiceAccount;

// // Initialize Firebase SDK
// admin.initializeApp({
//     credential: admin.credential.cert(serviceAccountKey),
// });

// //single user
// export const sendPushNotification = async (values: admin.messaging.Message) => {

//     try {
//         const res = await admin.messaging().send(values);
//         logger.info('Notification sent successfully', res);
//     } catch (error) {
//         console.log(error)

//     }
// };