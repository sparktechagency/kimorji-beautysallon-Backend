export type IVerifymobile = {
    mobileNumber: string;
    otpCode: number;
};

export type IVerifyEmail = {
    email: string;
    oneTimeCode: string;
}

export type ILoginData = {
    email: string;
    deviceToken:string;
    password: string;
};

export type IAuthResetPassword = {
    newPassword: string;
    confirmPassword: string;
};

export type IChangePassword = {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
};
  