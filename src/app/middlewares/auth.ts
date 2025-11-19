import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Secret } from 'jsonwebtoken';
import config from '../../config';
import { jwtHelper } from '../../helpers/jwtHelper';
import ApiError from '../../errors/ApiError';
import { User } from '../modules/user/user.model';


const auth = (...roles: string[]) => async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tokenWithBearer = req.headers.authorization;
        if (!tokenWithBearer) {
            throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are not authorized');
        }

        if (tokenWithBearer.startsWith('Bearer ')) {
            const token = tokenWithBearer.split(' ')[1];

            // verify token
            const verifyUser = jwtHelper.verifyToken(token, config.jwt.jwt_secret as Secret);

            // fetch full user including location
            const userFromDb = await User.findById(verifyUser.id).select('role location');
            if (!userFromDb) {
                throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not found');
            }

            // attach user object to request
            req.user = userFromDb;

            // guard user by role
            if (roles.length && !roles.includes(userFromDb.role)) {
                throw new ApiError(StatusCodes.FORBIDDEN, "You don't have permission to access this api");
            }

            next();
        }
    } catch (error) {
        next(error);
    }
};

export default auth;