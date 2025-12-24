import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { UserService } from './user.service';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';

// register user
const createUser = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { ...userData } = req.body;
    await UserService.createUserToDB(userData);

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'Please check your Phone Number to verify your account. We have sent you an OTP to complete the registration process.',
    })
});

// register admin
const createAdmin = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { ...userData } = req.body;
    const result = await UserService.createAdminToDB(userData);

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'Admin created successfully',
        data: result
    });
});

// retrieved user profile
const getUserProfile = catchAsync(async (req: Request, res: Response) => {
    const user = req.user;
    const result = await UserService.getUserProfileFromDB(user);

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'Profile data retrieved successfully',
        data: result
    });
});



const updateProfile = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    let profile, tradeLicences: string[] = [], proofOwnerId: string[] = [], sallonPhoto: string[] = [];

    if (req.files && 'image' in req.files && req.files.image[0]) { //not an array
        profile = `/images/${req.files.image[0].filename}`;
    }

    if (req.files && 'tradeLicences' in req.files && req.files.tradeLicences.length > 0) {
        tradeLicences = req.files.tradeLicences.map((file: Express.Multer.File) => `/tradeLicences/${file.filename}`);
    }

    if (req.files && 'proofOwnerId' in req.files && req.files.proofOwnerId.length > 0) {
        proofOwnerId = req.files.proofOwnerId.map((file: Express.Multer.File) => `/proofOwnerIds/${file.filename}`);
    }

    if (req.files && 'sallonPhoto' in req.files && req.files.sallonPhoto.length > 0) {
        sallonPhoto = req.files.sallonPhoto.map((file: Express.Multer.File) => `/sallonPhotos/${file.filename}`);
    }

    const data = {
        profile,
        tradeLicences,
        proofOwnerId,
        sallonPhoto,
        ...req.body,
    };

    const result = await UserService.updateProfileToDB(user, data);

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'Profile updated successfully',
        data: result,
    });
});


//update profile
const updateLocation = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    const payload = {
        longitude: Number(req.body.longitude),
        latitude: Number(req.body.latitude)
    }
    const result = await UserService.updateLocationToDB(user, payload);

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'User Location Updated successfully',
        data: result
    });
});

const toggleUserLock = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updatedUser = await UserService.toggleUserLock(id);

        return res.status(StatusCodes.OK).json({
            success: true,
            message: `User ${updatedUser.IsLocked ? "locked" : "unlocked"} successfully`,
            data: updatedUser
        });
    } catch (error: any) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message || "Something went wrong"
        });
    }
};

export const UserController = {
    createUser,
    createAdmin,
    getUserProfile,
    updateProfile,
    updateLocation,
    toggleUserLock
};