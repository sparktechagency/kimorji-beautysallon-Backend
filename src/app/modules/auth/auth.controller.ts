import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { AuthService } from './auth.service';
import { twilioClient, twilioServiceSid } from '../../../helpers/twillo';
import { AppError } from '../../../errors/error.app';
// const verifyMobile = catchAsync(async (req: Request, res: Response) => {
//   const { mobileNumber, otpCode } = req.body;

//   if (!mobileNumber || !otpCode) {
//     throw new AppError('Mobile number and OTP code are required', 400);
//   }
 

//   const result = await verifyOTP({ mobileNumber, otpCode });

//   sendResponse(res, {
//     success: true,
//     statusCode: 200,
//     message: result.message,
//     data: result.data,
//   });
// });

const verifyEmail = catchAsync(async (req: Request, res: Response) => {
    const { ...verifyData } = req.body;
    const result = await AuthService.verifyEmailToDB(verifyData);

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: result.message,
        data: result.data,
    });
});

// const loginUser = catchAsync(async (req: Request, res: Response) => {
//     const { ...loginData } = req.body;
//     const result = await AuthService.loginUserFromDB(loginData);

//     sendResponse(res, {
//         success: true,
//         statusCode: StatusCodes.OK,
//         message: 'User login successfully',
//         data: result
//     });
// });

const loginUser = catchAsync(async (req: Request, res: Response) => {
    const { phoneNumber } = req.body; // We are using phoneNumber to login
    const result = await AuthService.loginUserFromDB(phoneNumber, req.body.deviceToken);

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'OTP sent successfully, please verify to login.',
        data: result
    });
});


const forgetPassword = catchAsync(async (req: Request, res: Response) => {
    const email = req.body.email;
    const result = await AuthService.forgetPasswordToDB(email);

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'Please check your email, we send a OTP!',
        data: result
    });
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
    const token = req.headers.authorization;
    const { ...resetData } = req.body;
    const result = await AuthService.resetPasswordToDB(token!, resetData);

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'Password reset successfully',
        data: result
    });
});

const changePassword = catchAsync(async (req: Request, res: Response) => {
    const user = req.user;
    const { ...passwordData } = req.body;
    await AuthService.changePasswordToDB(user, passwordData);

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'Password changed successfully',
    });
});


const newAccessToken = catchAsync(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    const result = await AuthService.newAccessTokenToUser(refreshToken);

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'Generate Access Token successfully',
        data: result
    });
});

const socialLogin = catchAsync(async (req: Request, res: Response) => {
    const result = await AuthService.socialLoginFromDB(req.body);

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'Logged in Successfully',
        data: result
    });
});


const resendVerificationEmail = catchAsync(async (req: Request, res: Response) => {
    const { email } = req.body;
    const result = await AuthService.resendVerificationEmailToDB(email);

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'Generate OTP and send successfully',
        data: result
    });
});

// delete user
const deleteUser = catchAsync(async (req: Request, res: Response) => {
    const result = await AuthService.deleteUserFromDB(req.user, req.body.password);

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'Account Deleted successfully',
        data: result
    });
});

const verifyOTP = catchAsync(async (req: Request, res: Response) => {
    const { mobileNumber, otpCode } = req.body;
    const result = await AuthService.verifyOTP(mobileNumber, otpCode);

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'OTP verified successfully',
        data: result
    });
});

export const AuthController = {
    // verifyMobile,
    loginUser,
    forgetPassword,
    resetPassword,
    changePassword,
    newAccessToken,
    resendVerificationEmail,
    socialLogin,
    deleteUser,
    verifyEmail,
    verifyOTP
};