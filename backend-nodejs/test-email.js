import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('📧 SMTP Configuration Test');
console.log('==========================');

const smtpConfig = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: (process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
};

console.log('Configuration loaded:');
console.log(`- Host: ${smtpConfig.host}`);
console.log(`- Port: ${smtpConfig.port}`);
console.log(`- Secure: ${smtpConfig.secure}`);
console.log(`- User: ${smtpConfig.auth.user ? 'Set' : 'Missing'}`);
console.log(`- Pass: ${smtpConfig.auth.pass ? 'Set' : 'Missing'}`);
console.log(`- From: ${process.env.EMAIL_FROM}`);

if (!smtpConfig.host || !smtpConfig.auth.user || !smtpConfig.auth.pass) {
    console.error('\n❌ Missing required SMTP configuration in .env file.');
    console.error('Please ensure SMTP_HOST, SMTP_USER, and SMTP_PASS are set.');
    process.exit(1);
}

const transporter = nodemailer.createTransport(smtpConfig);

const testEmail = async () => {
    try {
        console.log('\n🔄 Verifying connection...');
        await transporter.verify();
        console.log('✅ Connection verified successfully!');

        console.log('\n📨 Sending test email...');
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || smtpConfig.auth.user,
            to: smtpConfig.auth.user, // Send to self for testing
            subject: 'DriveKenya SMTP Test',
            text: 'If you are reading this, your SMTP configuration is working correctly! 🚀',
            html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #4CAF50;">SMTP Test Successful! ✅</h2>
          <p>Your DriveKenya backend is now correctly configured to send emails.</p>
          <p><strong>Configuration Details:</strong></p>
          <ul>
            <li>Host: ${smtpConfig.host}</li>
            <li>Port: ${smtpConfig.port}</li>
            <li>User: ${smtpConfig.auth.user}</li>
          </ul>
          <p style="color: #888; font-size: 12px; margin-top: 20px;">Sent from DriveKenya Backend Test Script</p>
        </div>
      `,
        });

        console.log('✅ Email sent successfully!');
        console.log(`🆔 Message ID: ${info.messageId}`);
        console.log(`📧 Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    } catch (error) {
        console.error('\n❌ Error occurred:');
        console.error(error.message);

        if (error.code === 'EAUTH') {
            console.log('\n💡 Tip: Authentication failed. Check your username and password.');
            console.log('   If using Gmail, make sure you are using an App Password.');
        } else if (error.code === 'ESOCKET') {
            console.log('\n💡 Tip: Connection failed. Check your host and port.');
        }
    }
};

testEmail();
