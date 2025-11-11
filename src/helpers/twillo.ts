// import twilio from 'twilio';
// import { AppError } from '../errors/error.app';
// import config from "../config/index";
// import { formatPhoneNumber } from './formatPhoneNumber';

// const twilioClient = twilio(config.twilio.twilioAccountSid, config.twilio.twilioAuthToken);
// const twilioServiceSid = config.twilio.twilioServiceSid;

// const sendTwilioOTP = async (mobileNumber: string): Promise<string> => {
//   try {
//     const otp = Math.floor(100000 + Math.random() * 900000);
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
//     console.log(`OTP sent successfully, SID: ${verification.sid}, OTP: ${otp}`);
//     return verification.sid;
//   } catch (error) {
//     console.error(`Failed to send OTP to ${mobileNumber}:`, error);
//     throw new AppError('Failed to send OTP', 500);
//   }
//   //console otp
// };
// export { sendTwilioOTP, twilioClient, twilioServiceSid };

import twilio from 'twilio';
import { AppError } from '../errors/error.app';
import config from "../config/index";
import { formatPhoneNumber } from './formatPhoneNumber';

const twilioClient = twilio(config.twilio.twilioAccountSid, config.twilio.twilioAuthToken);
const twilioServiceSid = config.twilio.twilioServiceSid;

const sendTwilioOTP = async (mobileNumber: string): Promise<string> => {
  try {
    const formattedNumber = formatPhoneNumber(mobileNumber);
    console.log(`📱 Sending OTP to: ${formattedNumber}`);

    const verification = await twilioClient.verify.v2
      .services(twilioServiceSid)
      .verifications.create({
        to: formattedNumber,
        channel: 'sms'
      });

    console.log(`✅ OTP sent successfully, SID: ${verification.sid}`);
    return verification.sid;
  } catch (error: any) {
    console.error(`❌ Failed to send OTP:`, error);
    throw new AppError(`Failed to send OTP: ${error.message}`, 500);
  }
};

const verifyTwilioOTP = async (mobileNumber: string, otpCode: string): Promise<boolean> => {
  try {
    const formattedNumber = formatPhoneNumber(mobileNumber);
    console.log(`🔍 Verifying OTP for: ${formattedNumber}, Code: ${otpCode}`);

    const verificationCheck = await twilioClient.verify.v2
      .services(twilioServiceSid)
      .verificationChecks.create({
        to: formattedNumber,
        code: otpCode
      });

    console.log(`📊 Verification status: ${verificationCheck.status}`);
    return verificationCheck.status === 'approved';
  } catch (error: any) {
    console.error(`❌ OTP verification failed:`, error);

    if (error.code === 20404) {
      throw new AppError('OTP has expired or is invalid', 400);
    }
    if (error.code === 60200) {
      throw new AppError('Invalid verification code', 400);
    }

    throw new AppError('Failed to verify OTP', 500);
  }
};

export { sendTwilioOTP, verifyTwilioOTP, twilioClient, twilioServiceSid };