import colors from 'colors';
import { User } from '../app/modules/user/user.model';
import config from '../config';
import { USER_ROLES } from '../enums/user';
import { logger } from '../shared/logger';

const superUser = {
    name: 'Super Admin',
    role: USER_ROLES.ADMIN,
    email: config.admin.email,
    password: config.admin.password,
    verified: true,
};

const seedSuperAdmin = async () => {
    try {
        if (!superUser.email || !superUser.password) {
            logger.error(colors.red('❌ ADMIN email/password not provided in config'));
            return;
        }

        const isExistSuperAdmin = await User.findOne({
            role: USER_ROLES.ADMIN,
            // যদি soft delete সিস্টেম থাকে:
            // isDeleted: false,
        });

        if (isExistSuperAdmin) {
            logger.info(colors.yellow('ℹ Super admin already exists, skipping seeding.'));
            return;
        }

        await User.create(superUser); // pre-save hooks (e.g., password hash) run here
        logger.info(colors.green('✔ Super admin created successfully!'));
    } catch (err: any) {
        logger.error(colors.red(`❌ Failed to seed Super Admin: ${err?.message || err}`));
    }
};

export default seedSuperAdmin;
