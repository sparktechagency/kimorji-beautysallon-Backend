import dotenv from "dotenv";
import path from "path";
dotenv.config({path: path.join(process.cwd(), '.env')});

export default{
    ip_address: process.env.IP,
    port: process.env.PORT,
    database_url: process.env.DATABASE_URL,
    node_env: process.env.NODE_ENV,
    bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS,
    jwt: {
        jwt_secret: process.env.JWT_SECRET,
        jwt_expire_in: process.env.JWT_EXPIRE_IN,
        jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
        jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN
    },
    stripe:{
        stripeSecretKey:process.env.STRIPE_API_SECRET,
        webhookSecret:process.env.STRIPE_WEBHOOK_SECRET
    },
    email:{
        from: process.env.EMAIL_FROM,
        user: process.env.EMAIL_USER,
        port: process.env.EMAIL_PORT,
        host: process.env.EMAIL_HOST,
        pass: process.env.EMAIL_PASS
    },
    admin: {
        email:process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD
    },
  twilio: {
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || 'your_twilio_sid',
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || 'your_twilio_auth_token',
    twilioServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID || 'your_twilio_verify_service_sid',
  },
    
    google_maps: process.env.GOOGLE_MAPS_API_KEY
}