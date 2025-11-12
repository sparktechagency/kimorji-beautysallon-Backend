import { Model } from 'mongoose';
import { USER_ROLES } from '../../../enums/user';

interface IStripeAccountInfo {
    status?: boolean;
    accountId?: string;
    externalAccountId?: string;
    accountUrl?: string;
    currency?: string;
}

interface IAuthenticationProps {
    isResetPassword: boolean;
    otpCode: string;
    expireAt: Date;
}

export type IUser = {
    _id: any;
    name: string;
    appId?: string;
    fcmToken?: string;
    role: USER_ROLES;
    mobileNumber?: string;
    email?: string;
    password: string;
    isSubscribed?: boolean;
    location: {};
    address: string
    about: string
    dateOfBirth: string;
    gender: "Male" | "Female" | "Children" | "Others";
    isDeleted: boolean;
    profile: string;
    tradeLicences?: string[];
    proofOwnerId?: string[];
    sallonPhoto?: string[];
    isUpdate: boolean;
    verified: boolean;
    discount?: number;
    deviceToken?: string;
    // authentication?: IAuthenticationProps;
    // authentication: IAuthenticationProps;
    authentication: {
        isResetPassword: boolean;
        otpCode: string;
        expireAt: Date;
    };
    accountInformation?: IStripeAccountInfo;
}

export type UserModal = {
    isExistUserById(id: string): any;
    isExistUserByEmail(email: string): any;
    isAccountCreated(id: string): any;
    isMatchPassword(password: string, hashPassword: string): boolean;
} & Model<IUser>;