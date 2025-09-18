import twilio from 'twilio';
import {AppError} from '../errors/error.app';
import  config  from "../config/index";
import { formatPhoneNumber } from './formatPhoneNumber';

// const twilioClient = twilio(config.twilio.twilioAccountSid, config.twilio.twilioAuthToken);
// const twilioServiceSid = config.twilio.twilioServiceSid;

// const sendTwilioOTP = async (mobileNumber: string): Promise<string> => {
//   try {
//         const otp = Math.floor(100000 + Math.random() * 900000); 
//     console.log(`OTP generated: ${otp}`);
    
//     console.log(`Attempting to send OTP to: ${mobileNumber}`);
//     const verification = await twilioClient.verify.v2
//       .services(twilioServiceSid)
//       .verifications.create({
//         // to: mobileNumber,
//         // channel: 'sms'
//         to: formatPhoneNumber(mobileNumber),
//         channel: 'sms'
//       });
//     //log otp
// console.log(`OTP sent successfully, SID: ${verification.sid}, OTP: ${otp}`);
//     return verification.sid;
//   } catch (error) {
//     console.error(`Failed to send OTP to ${mobileNumber}:`, error);
//     throw new AppError('Failed to send OTP', 500);
//   }
//   //console otp
// };
// export { sendTwilioOTP, twilioClient, twilioServiceSid };



const twilioClient = twilio(config.twilio.twilioAccountSid, config.twilio.twilioAuthToken);
const twilioServiceSid = config.twilio.twilioServiceSid;

const sendTwilioOTP = async (mobileNumber: string, otp: string): Promise<string> => {
  try {
    console.log(`Attempting to send OTP to: ${mobileNumber}`);

    // Send OTP via Twilio's API
    const verification = await twilioClient.verify.v2
      .services(twilioServiceSid)
      .verifications.create({
        to: formatPhoneNumber(mobileNumber),
        channel: 'sms',
      });

    // Log the OTP (useful for debugging, but don't log sensitive data in production)
    console.log(`OTP sent successfully to ${mobileNumber}, SID: ${verification.sid}, OTP: ${otp}`);
    return verification.sid;
  } catch (error) {
    console.error(`Failed to send OTP to ${mobileNumber}:`, error);
    throw new AppError('Failed to send OTP', 500);
  }
};

export { sendTwilioOTP, twilioClient, twilioServiceSid };
