import bcrypt from 'bcrypt';
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { JwtPayload, Secret } from 'jsonwebtoken';
import config from '../../../config';
import ApiError from '../../../errors/ApiError';
import { emailHelper } from '../../../helpers/emailHelper';
import { jwtHelper } from '../../../helpers/jwtHelper';
import { emailTemplate } from '../../../shared/emailTemplate';
import {
  IAuthResetPassword,
  IChangePassword,
  ILoginData,
  IVerifyEmail,
  IVerifymobile
} from '../../../types/auth';
import cryptoToken from '../../../util/cryptoToken';
import generateOTP from '../../../util/generateOTP';
import { ResetToken } from '../resetToken/resetToken.model';
import { User } from '../user/user.model';
import { IUser } from '../user/user.interface';
import { jwt } from 'twilio';
import { AppError } from '../../../errors/error.app';
import { formatPhoneNumber } from '../../../helpers/formatedPhoneNumber';
import { sendTwilioOTP, twilioClient, twilioServiceSid } from '../../../helpers/twillo';
import { USER_ROLES } from '../../../enums/user';
import { NextFunction } from 'express';
import DeviceToken from '../fcmToken/fcm.token.model';

const verifyTwilioOTP = async (mobileNumber: string, otpCode: string): Promise<boolean> => {
  try {
    const verificationCheck = await twilioClient.verify.v2
      .services(twilioServiceSid)
      .verificationChecks.create({
        to: mobileNumber,
        code: otpCode
      });

    console.log('Twilio OTP verification response:', verificationCheck);
    return verificationCheck.status === 'approved';
  } catch (error) {
    console.error('Error during OTP verification:', error);
    return false;
  }
};

//login
const loginUserFromDB = async (payload: ILoginData) => {

  const { email, password, deviceToken } = payload;
  const isExistUser: any = await User.findOne({ email }).select('+password');
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  //check verified and status
  if (!isExistUser.verified) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Please verify your account, then try to login again');
  }

  //check match password
  if (password && !(await User.isMatchPassword(password, isExistUser.password))) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Password is incorrect!');
  }

  await User.findOneAndUpdate(
    { _id: isExistUser._id },
    { deviceToken: deviceToken },
    { new: true },
  )

  //create token
  const accessToken = jwtHelper.createToken(
    { id: isExistUser._id, role: isExistUser.role, email: isExistUser.email },
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_expire_in as string
  );

  //create token
  const refreshToken = jwtHelper.createToken(
    { id: isExistUser._id, role: isExistUser.role, email: isExistUser.email },
    config.jwt.jwtRefreshSecret as Secret,
    config.jwt.jwtRefreshExpiresIn as string
  );

  return { accessToken, refreshToken };
};

const forgetPasswordToDB = async (email: string) => {

  const isExistUser = await User.isExistUserByEmail(email);
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  //send mail
  const otp = generateOTP();
  const value = {
    otp,
    email: isExistUser.email
  };

  const forgetPassword = emailTemplate.resetPassword(value);
  emailHelper.sendEmail(forgetPassword);

  //save to DB
  const authentication = {
    otpCode: otp,
    expireAt: new Date(Date.now() + 3 * 60000)
  };
  await User.findOneAndUpdate({ email }, { $set: { authentication } });
};

// export const verifyOTP = async (payload: IVerifymobile) => {
//   const { mobileNumber, otpCode } = payload;

//   if (!mobileNumber) {
//     throw new AppError('Mobile number is required', 400);
//   }

//   const formattedNumber = formatPhoneNumber(mobileNumber.toString());

//   const isValidOTP = await verifyTwilioOTP(formattedNumber, otpCode.toString());
//   if (!isValidOTP) {
//     throw new AppError('Invalid or expired OTP', 400);
//   }

//   const user = await User.findOne({ mobileNumber: formattedNumber });
//   if (!user) {
//     throw new AppError('User account not found. To continue, please create an account', 404);
//   }

//   if (!user.verified) {
//     await User.findByIdAndUpdate(user._id, { verified: true });
//   }

//   const accessToken = jwtHelper.createToken(
//     { id: user._id, role: user.role, mobileNumber: user.mobileNumber },
//     config.jwt.jwt_secret as Secret,
//     config.jwt.jwt_expire_in as string
//   );

//   const refreshToken = jwtHelper.createToken(
//     { id: user._id, role: user.role, mobileNumber: user.mobileNumber },
//     config.jwt.jwtRefreshSecret as Secret,
//     config.jwt.jwtRefreshExpiresIn as string
//   );

//   // Return success message and data
//   return {
//     message: 'Mobile number verified successfully',
//     data: { accessToken, refreshToken, user },
//   };
// };

//verify email

const verifyEmailToDB = async (payload: IVerifyEmail) => {
  const { email, oneTimeCode } = payload;
  const isExistUser = await User.findOne({ email }).select('+authentication');
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  console.log('OTP provided by user:', oneTimeCode);
  console.log('OTP stored in DB:', isExistUser.authentication?.otpCode);

  if (isExistUser.authentication?.otpCode !== oneTimeCode) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'You provided wrong otp');
  }

  const date = new Date();
  if (date > isExistUser.authentication?.expireAt) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Otp already expired, Please try again');
  }

  let message;
  let data;

  if (!isExistUser.verified) {
    await User.findOneAndUpdate(
      { _id: isExistUser._id },
      { verified: true, authentication: { oneTimeCode: null, expireAt: null } }
    );
    message = 'Email verified successfully';
  } else {
    await User.findOneAndUpdate(
      { _id: isExistUser._id },
      {
        authentication: {
          isResetPassword: true,
          oneTimeCode: null,
          expireAt: null,
        }
      }
    );


    const createToken = cryptoToken();
    await ResetToken.create({
      user: isExistUser._id,
      token: createToken,
      expireAt: new Date(Date.now() + 5 * 60000),
    });
    message = 'Verification Successful: Please securely store and utilize this code for password reset';
    data = createToken;
  }

  return { data, message };
};

// const loginService = async (mobileNumber: string, fcmToken: string, deviceId: string, deviceType: string, role: string) => {
//   const formattedNumber = formatPhoneNumber(mobileNumber);

//   let existingUser = await User.findOne({ mobileNumber: formattedNumber });
//   let message = '';
//   let userId = '';

//   if (!existingUser) {
//     const newUser = new User({
//       mobileNumber: formattedNumber,
//       verified: false,
//       role: USER_ROLES.CUSTOMER && USER_ROLES.BARBER
//     });

//     await newUser.save();
//     message = "Please verify your registration OTP and add this number";
//     userId = newUser._id.toString();

//     const otpCode = generateOTP();
//     console.log('Generated OTP for registration:', otpCode); 

//     await sendTwilioOTP(formattedNumber, otpCode.toString());

//     const authentication = {
//       otpCode: otpCode.toString(),
//       expireAt: new Date(Date.now() + 3 * 60000), 
//     };

//     console.log('Saving OTP and expiration time:', authentication);

//     const updatedUser = await User.findOneAndUpdate(
//       { _id: newUser._id },
//       { $set: { authentication } },
//       { new: true } 
//     );

//     console.log('User after saving OTP:', updatedUser?.authentication);  
//   } else {
//     message = "Please verify your login OTP";
//     userId = existingUser._id.toString();

//     const otpCode = generateOTP(); 
//     console.log('Generated OTP for login:', otpCode); 

//     await sendTwilioOTP(formattedNumber, otpCode.toString());

//     const authentication = {
//       otpCode: otpCode.toString(),
//       expireAt: new Date(Date.now() + 3 * 60000), 
//     };

//     console.log('Saving OTP and expiration time:', authentication);

//     const updatedUser = await User.findOneAndUpdate(
//       { _id: existingUser._id },
//       { $set: { authentication } },
//       { new: true } 
//     );

//     console.log('User after saving OTP:', updatedUser?.authentication); 
//   }



//   if (fcmToken && deviceId) {
//     const existingToken = await DeviceToken.findOne({
//       userId: existingUser?._id,
//       deviceId: deviceId
//     });

//     if (existingToken) {
//       existingToken.fcmToken = fcmToken;
//       existingToken.deviceType = deviceType;
//       await existingToken.save();
//     } else {
//       await DeviceToken.create({
//         userId: existingUser?._id,
//         fcmToken,
//         deviceId,
//         deviceType
//       });
//     }
//   }

//   const user = existingUser || (await User.findOne({ _id: userId }));

//   if (!user) {
//     throw new AppError('User not found after registration/login process', 404);
//   }

//   const accessToken = jwtHelper.createToken(
//     { id: user._id, role: user.role },
//     config.jwt.jwt_secret as Secret,
//     config.jwt.jwt_expire_in as string
//   );

//   // Create refresh token
//   const refreshToken = jwtHelper.createToken(
//     { id: user._id, role: user.role },
//     config.jwt.jwtRefreshSecret as Secret,
//     config.jwt.jwtRefreshExpiresIn as string
//   );

//   return { message, userId, accessToken, refreshToken };
// };

const loginService = async (
  mobileNumber: string,
  fcmToken: string,
  deviceId: string,
  deviceType: string,
  role: USER_ROLES
) => {
  // Validate role
  const validRoles = [USER_ROLES.CUSTOMER, USER_ROLES.BARBER];
  if (!validRoles.includes(role)) {
    throw new AppError(`Invalid role. Must be either ${USER_ROLES.CUSTOMER} or ${USER_ROLES.BARBER}`, 400);
  }

  const formattedNumber = formatPhoneNumber(mobileNumber);

  let existingUser = await User.findOne({ mobileNumber: formattedNumber });
  let message = '';
  let userId = '';

  if (!existingUser) {
    const newUser = new User({
      mobileNumber: formattedNumber,
      verified: false,
      role: role
    });

    await newUser.save();
    message = "Please verify your registration OTP and add this number";
    userId = newUser._id.toString();

    const otpCode = generateOTP();
    console.log('Generated OTP for registration:', otpCode);

    await sendTwilioOTP(formattedNumber, otpCode.toString());

    const authentication = {
      otpCode: otpCode.toString(),
      expireAt: new Date(Date.now() + 3 * 60000),
    };

    console.log('Saving OTP and expiration time:', authentication);

    const updatedUser = await User.findOneAndUpdate(
      { _id: newUser._id },
      { $set: { authentication } },
      { new: true }
    );

    console.log('User after saving OTP:', updatedUser?.authentication);
  } else {
    // Check if existing user's role matches the provided role
    if (existingUser.role !== role) {
      throw new AppError(`User is registered as ${existingUser.role}, cannot login as ${role}`, 403);
    }

    message = "Please verify your login OTP";
    userId = existingUser._id.toString();

    const otpCode = generateOTP();
    console.log('Generated OTP for login:', otpCode);

    await sendTwilioOTP(formattedNumber, otpCode.toString());

    const authentication = {
      otpCode: otpCode.toString(),
      expireAt: new Date(Date.now() + 3 * 60000),
    };

    console.log('Saving OTP and expiration time:', authentication);

    const updatedUser = await User.findOneAndUpdate(
      { _id: existingUser._id },
      { $set: { authentication } },
      { new: true }
    );

    console.log('User after saving OTP:', updatedUser?.authentication);
  }

  if (fcmToken && deviceId) {
    const existingToken = await DeviceToken.findOne({
      userId: existingUser?._id || userId,
      deviceId: deviceId
    });

    if (existingToken) {
      existingToken.fcmToken = fcmToken;
      existingToken.deviceType = deviceType;
      await existingToken.save();
    } else {
      await DeviceToken.create({
        userId: existingUser?._id || userId,
        fcmToken,
        deviceId,
        deviceType
      });
    }
  }

  const user = existingUser || (await User.findOne({ _id: userId }));

  if (!user) {
    throw new AppError('User not found after registration/login process', 404);
  }

  const accessToken = jwtHelper.createToken(
    { id: user._id, role: user.role },
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_expire_in as string
  );

  const refreshToken = jwtHelper.createToken(
    { id: user._id, role: user.role },
    config.jwt.jwtRefreshSecret as Secret,
    config.jwt.jwtRefreshExpiresIn as string
  );

  return { message, userId, accessToken, refreshToken };
};

const verifyLoginOTPService = async (mobileNumber: string, otpCode: string) => {
  const formattedNumber = formatPhoneNumber(mobileNumber);

  const user = await User.findOne({ mobileNumber: formattedNumber }).select('+authentication');

  if (!user) {
    throw new AppError('User account was not found. Please create an account', 404);
  }

  const storedOtp = user.authentication?.otpCode;
  const expireAt = user.authentication?.expireAt;

  console.log('OTP submitted by user:', otpCode);
  console.log('Stored OTP in DB:', storedOtp);
  console.log('OTP expiration time:', expireAt);

  if (!storedOtp || storedOtp !== otpCode) {
    throw new AppError('Invalid OTP', 400);
  }

  const dateNow = new Date();
  console.log('Current time:', dateNow);

  if (!expireAt || dateNow > expireAt) {
    throw new AppError('OTP has expired, please request a new OTP', 400);
  }

  if (!user.verified) {
    await User.findOneAndUpdate(
      { _id: user._id },
      {
        verified: true,
        'authentication.otpCode': null,
        'authentication.expireAt': null
      }
    );
    console.log('User verified and OTP cleared.');
  }

  const accessToken = jwtHelper.createToken(
    { id: user._id, role: user.role },
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_expire_in as string
  );

  const refreshToken = jwtHelper.createToken(
    { id: user._id, role: user.role },
    config.jwt.jwtRefreshSecret as Secret,
    config.jwt.jwtRefreshExpiresIn as string
  );

  return { accessToken, refreshToken, user };
};

const resetPasswordToDB = async (token: string, payload: IAuthResetPassword) => {

  const { newPassword, confirmPassword } = payload;

  //isExist token
  const isExistToken = await ResetToken.isExistToken(token);
  if (!isExistToken) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are not authorized');
  }

  //user permission check
  const isExistUser = await User.findById(isExistToken.user).select('+authentication');
  if (!isExistUser?.authentication?.isResetPassword) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "You don't have permission to change the password. Please click again to 'Forgot Password'");
  }

  //validity check
  const isValid = await ResetToken.isExpireToken(token);
  if (!isValid) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Token expired, Please click again to the forget password');
  }

  //check password
  if (newPassword !== confirmPassword) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "New password and Confirm password doesn't match!");
  }

  const hashPassword = await bcrypt.hash(newPassword, Number(config.bcrypt_salt_rounds));

  const updateData = {
    password: hashPassword,
    authentication: {
      isResetPassword: false,
    }
  };

  await User.findOneAndUpdate(
    { _id: isExistToken.user },
    updateData,
    { new: true }
  );
};

const changePasswordToDB = async (user: JwtPayload, payload: IChangePassword) => {

  const { currentPassword, newPassword, confirmPassword } = payload;
  const isExistUser = await User.findById(user.id).select('+password');
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  //current password match
  if (currentPassword && !(await User.isMatchPassword(currentPassword, isExistUser.password))) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Password is incorrect');
  }

  //newPassword and current password
  if (currentPassword === newPassword) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Please give different password from current password');
  }

  //new password and confirm password check
  if (newPassword !== confirmPassword) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Password and Confirm password doesn't matched");
  }

  //hash password
  const hashPassword = await bcrypt.hash(newPassword, Number(config.bcrypt_salt_rounds));

  const updateData = {
    password: hashPassword,
  };

  await User.findOneAndUpdate({ _id: user.id }, updateData, { new: true });
};


const newAccessTokenToUser = async (token: string) => {

  // Check if the token is provided
  if (!token) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Token is required!');
  }

  const verifyUser = jwtHelper.verifyToken(
    token,
    config.jwt.jwtRefreshSecret as Secret
  );

  const isExistUser = await User.findById(verifyUser?.id);
  if (!isExistUser) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Unauthorized access")
  }

  //create token
  const accessToken = jwtHelper.createToken(
    { id: isExistUser._id, role: isExistUser.role, email: isExistUser.email },
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_expire_in as string
  );

  return { accessToken }
}

const resendVerificationEmailToDB = async (email: string) => {

  // Find the user by ID
  const existingUser: any = await User.findOne({ email: email }).lean();

  if (!existingUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User with this email does not exist!',);
  }

  if (existingUser?.isVerified) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'User is already verified!');
  }

  // Generate OTP and prepare email
  const otp = generateOTP();
  const emailValues = {
    name: existingUser.firstName,
    otp,
    email: existingUser.email,
  };

  const accountEmailTemplate = emailTemplate.createAccount(emailValues);
  emailHelper.sendEmail(accountEmailTemplate);

  // Update user with authentication details
  const authentication = {
    oneTimeCode: otp,
    expireAt: new Date(Date.now() + 3 * 60000),
  };

  await User.findOneAndUpdate(
    { email: email },
    { $set: { authentication } },
    { new: true }
  );
};

// social authentication
const socialLoginFromDB = async (payload: IUser) => {

  const { appId, role, deviceToken } = payload;

  const isExistUser = await User.findOne({ appId });

  if (isExistUser) {

    //create token
    const accessToken = jwtHelper.createToken(
      { id: isExistUser._id, role: isExistUser.role },
      config.jwt.jwt_secret as Secret,
      config.jwt.jwt_expire_in as string
    );

    //create token
    const refreshToken = jwtHelper.createToken(
      { id: isExistUser._id, role: isExistUser.role },
      config.jwt.jwtRefreshSecret as Secret,
      config.jwt.jwtRefreshExpiresIn as string
    );

    await User.findOneAndUpdate(
      { _id: isExistUser._id },
      { deviceToken: deviceToken },
      { new: true },
    )

    return { accessToken, refreshToken };

  } else {

    const user = await User.create({ appId, role, verified: true });
    if (!user) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to created User")
    }

    //create token
    const accessToken = jwtHelper.createToken(
      { id: user._id, role: user.role },
      config.jwt.jwt_secret as Secret,
      config.jwt.jwt_expire_in as string
    );

    //create token
    const refreshToken = jwtHelper.createToken(
      { id: user._id, role: user.role },
      config.jwt.jwtRefreshSecret as Secret,
      config.jwt.jwtRefreshExpiresIn as string
    );

    await User.findOneAndUpdate(
      { _id: user._id },
      { deviceToken: deviceToken },
      { new: true },
    )

    return { accessToken, refreshToken };
  }
}

// delete user
const deleteUserFromDB = async (user: JwtPayload, password: string) => {

  const isExistUser = await User.findById(user.id).select('+password');
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  //check match password
  if (password && !(await User.isMatchPassword(password, isExistUser.password))) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Password is incorrect');
  }

  const updateUser = await User.findByIdAndDelete(user.id);
  if (!updateUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }
  return;
};

export const AuthService = {

  loginUserFromDB,
  forgetPasswordToDB,
  resetPasswordToDB,
  changePasswordToDB,
  newAccessTokenToUser,
  resendVerificationEmailToDB,
  socialLoginFromDB,
  deleteUserFromDB,
  // verifyOTP,
  verifyEmailToDB,
  verifyTwilioOTP,
  loginService,
  verifyLoginOTPService
};
