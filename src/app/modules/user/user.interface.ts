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
    otpCode: number;
    oneTimeCode: string;
    expireAt: Date;
}

export type IUser = {
    name: string;
    appId?: string;
    role: USER_ROLES;
    mobileNumber: string;
    email: string;
    password: string;
    isSubscribed?: boolean;
    location: {};
    address:string
    about:string
    dateOfBirth:string;
    gender: "Male" | "Female" | "Children" | "Others";
    profile: string;
    verified: boolean;
    discount?: number;
    deviceToken?: string;
    authentication?: IAuthenticationProps;
    accountInformation?: IStripeAccountInfo;
}

export type UserModal = {
    isExistUserById(id: string): any;
    isExistUserByEmail(email: string): any;
    isAccountCreated(id: string): any;
    isMatchPassword(password: string, hashPassword: string): boolean;
} & Model<IUser>;