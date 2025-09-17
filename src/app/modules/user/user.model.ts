import { model, Schema } from "mongoose";
import { USER_ROLES } from "../../../enums/user";
import { IUser, UserModal } from "./user.interface";
import bcrypt from "bcrypt";
import ApiError from "../../../errors/ApiError";
import { StatusCodes } from "http-status-codes";
import config from "../../../config";

const userSchema = new Schema<IUser, UserModal>(
  {
    name: {
      type: String,
      required: false,
    },
    appId: {
      type: String,
      required: false,
    },

    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      required: true,
    },

    email: {
      type: String,
      required: false,  // Email is not required anymore
      unique: false,    // Removed unique constraint on email
      immutable: true,
      lowercase: true,
    },

    mobileNumber: {
      type: String,
      required: true,
      unique: true,  // Mobile number should be unique
      immutable: true,
    },

    password: {
      type: String,
      required: false,
      select: 0,  // Password is not required for OTP-based login
    },

    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: false,
      },
      coordinates: {
        type: [Number],
        required: false,
      },
    },

    profile: {
      type: String,
      default: 'https://res.cloudinary.com/ddqovbzxy/image/upload/v1736572642/avatar_ziy9mp.jpg',
    },

    verified: {
      type: Boolean,
      default: false,
    },

    isSubscribed: {
      type: Boolean,
    },

    about: {
      type: String,
      required: false,
    },

    address: {
      type: String,
      required: false,
    },

    dateOfBirth: {
      type: String,
      required: false,
    },

    gender: {
      type: String,
      enum: ["Male", "Female", "Children", 'Others'],
      required: false,
    },

    authentication: {
      type: {
        isResetPassword: {
          type: Boolean,
          default: false,
        },
        otpCode: {
          type: Number,
          default: null,
        },
        expireAt: {
          type: Date,
          default: null,
        },
      },
      select: 0,
    },

    accountInformation: {
      status: { type: Boolean },
      accountId: { type: String },
      externalAccountId: { type: String },
      accountUrl: { type: String },
      currency: { type: String },
    },

    discount: {
      type: Number,
    },

    deviceToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ location: '2dsphere' });

// Check if mobile number exists before creating a new user
userSchema.statics.isExistUserByMobileNumber = async (mobileNumber: string) => {
  const isExist = await User.findOne({ mobileNumber });
  return isExist;
};

// Handle OTP verification and login
userSchema.pre('save', async function (next) {
  const user = this as IUser;

  // Check if user exists by mobile number before saving
  const isExist = await User.findOne({ mobileNumber: user.mobileNumber });
  if (isExist) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Mobile number already exists!');
  }

  next();
});

export const User = model<IUser, UserModal>("User", userSchema);

