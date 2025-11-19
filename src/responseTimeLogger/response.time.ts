import { Request, Response, NextFunction } from "express";
import colors from "colors";
import { logger, errorLogger } from "../shared/logger";
import config from "../config";
const requestCount: Record<string, number> = {};
const getIpAddress = (req: Request): string => {
    return (
        (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
        req.socket.remoteAddress ||
        'unknown'
    );
};

const getIpFormat = (req: Request): string => {
    return config.node_env === 'development' ? `${getIpAddress(req)} - ` : '';
};

export function requestLogger() {
    return (req: Request, res: Response, next: NextFunction) => {
        const start = Date.now();
        const key = `${req.method} ${req.path}`;
        requestCount[key] = (requestCount[key] || 0) + 1;
        const hit = requestCount[key];


        res.on("finish", () => {
            const duration = Date.now() - start;
            const ipFormat = getIpFormat(req);
            const statusColored =
                res.statusCode >= 500
                    ? colors.red(res.statusCode.toString())
                    : res.statusCode >= 400
                        ? colors.yellow(res.statusCode.toString())
                        : colors.green(res.statusCode.toString());

            const methodColored = colors.cyan(req.method);

            const urlColored = colors.white(req.originalUrl);

            const timeColored =
                duration > 500
                    ? colors.red(`${duration} ms`)
                    : colors.gray(`${duration} ms`);

            const hitColored = colors.magenta(`[Hit #${hit}]`);


            const logMessage = `${ipFormat}${methodColored} ${urlColored} ${statusColored} - ${timeColored} ${hitColored}`;

            if (res.statusCode >= 400) {
                errorLogger.error(logMessage);
            } else {
                logger.info(logMessage);
            }
        });

        next();
    };
}