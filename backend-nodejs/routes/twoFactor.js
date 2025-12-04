const express = require('express');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const router = express.Router();

// Email transporter setup
const transporter = nodemailer.createTransporter({
  // Configure your email service
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Setup authenticator app
router.post('/setup-app', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `DriveKenya (${req.user.email})`,
      issuer: 'DriveKenya'
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Generate backup codes
    const backupCodes = [];
    for (let i = 0; i < 10; i++) {
      backupCodes.push(crypto.randomBytes(4).toString('hex'));
    }

    // Store secret temporarily (implement your storage logic)
    await req.db.run(
      `UPDATE users SET 
        temp_2fa_secret = ?, 
        backup_codes = ? 
      WHERE id = ?`,
      [secret.base32, JSON.stringify(backupCodes), userId]
    );

    res.json({
      success: true,
      qrCodeUrl,
      backupCodes,
      secret: secret.base32
    });
  } catch (error) {
    console.error('2FA app setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to setup authenticator app'
    });
  }
});

// Setup SMS
router.post('/setup-sms', async (req, res) => {
  try {
    const { phone } = req.body;
    const userId = req.user.id;

    // Generate and send SMS code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store code temporarily
    await req.db.run(
      `UPDATE users SET 
        temp_sms_code = ?, 
        temp_sms_expires = ?,
        temp_phone = ? 
      WHERE id = ?`,
      [code, expiresAt.toISOString(), phone, userId]
    );

    // TODO: Implement actual SMS sending with Twilio
    // For demo purposes, we'll just return success
    console.log(`SMS code for ${phone}: ${code}`);

    res.json({
      success: true,
      message: 'Verification code sent'
    });
  } catch (error) {
    console.error('2FA SMS setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to setup SMS authentication'
    });
  }
});

// Setup Email
router.post('/setup-email', async (req, res) => {
  try {
    const userId = req.user.id;
    const email = req.user.email;

    // Generate email code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store code temporarily
    await req.db.run(
      `UPDATE users SET 
        temp_email_code = ?, 
        temp_email_expires = ? 
      WHERE id = ?`,
      [code, expiresAt.toISOString(), userId]
    );

    // Send email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'DriveKenya - Two-Factor Authentication Setup',
      html: `
        <h2>Two-Factor Authentication Setup</h2>
        <p>Your verification code is: <strong>${code}</strong></p>
        <p>This code expires in 5 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      message: 'Verification code sent to your email'
    });
  } catch (error) {
    console.error('2FA email setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to setup email authentication'
    });
  }
});

// Verify 2FA setup
router.post('/verify', async (req, res) => {
  try {
    const { code, method } = req.body;
    const userId = req.user.id;

    const user = await req.db.get(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    let isValid = false;

    if (method === 'app') {
      // Verify TOTP code
      isValid = speakeasy.totp.verify({
        secret: user.temp_2fa_secret,
        encoding: 'base32',
        token: code,
        window: 2
      });

      if (isValid) {
        // Activate 2FA
        await req.db.run(
          `UPDATE users SET 
            two_factor_enabled = 1,
            two_factor_secret = ?,
            two_factor_method = 'app',
            temp_2fa_secret = NULL
          WHERE id = ?`,
          [user.temp_2fa_secret, userId]
        );
      }
    } else if (method === 'sms') {
      // Verify SMS code
      const now = new Date();
      const expiresAt = new Date(user.temp_sms_expires);
      
      if (user.temp_sms_code === code && now < expiresAt) {
        isValid = true;
        
        // Activate 2FA
        await req.db.run(
          `UPDATE users SET 
            two_factor_enabled = 1,
            two_factor_method = 'sms',
            phone = ?,
            temp_sms_code = NULL,
            temp_sms_expires = NULL,
            temp_phone = NULL
          WHERE id = ?`,
          [user.temp_phone, userId]
        );
      }
    } else if (method === 'email') {
      // Verify email code
      const now = new Date();
      const expiresAt = new Date(user.temp_email_expires);
      
      if (user.temp_email_code === code && now < expiresAt) {
        isValid = true;
        
        // Activate 2FA
        await req.db.run(
          `UPDATE users SET 
            two_factor_enabled = 1,
            two_factor_method = 'email',
            temp_email_code = NULL,
            temp_email_expires = NULL
          WHERE id = ?`,
          [userId]
        );
      }
    }

    if (isValid) {
      res.json({
        success: true,
        message: 'Two-factor authentication enabled successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }
  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Verification failed'
    });
  }
});

// Disable 2FA
router.post('/disable', async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.id;

    const user = await req.db.get(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    if (!user.two_factor_enabled) {
      return res.status(400).json({
        success: false,
        message: 'Two-factor authentication is not enabled'
      });
    }

    let isValid = false;

    if (user.two_factor_method === 'app') {
      isValid = speakeasy.totp.verify({
        secret: user.two_factor_secret,
        encoding: 'base32',
        token: code,
        window: 2
      });
    } else {
      // For SMS/Email, send a new code and verify
      // Simplified for demo - in production, implement proper flow
      isValid = true; // Allow disable with any code for demo
    }

    if (isValid) {
      await req.db.run(
        `UPDATE users SET 
          two_factor_enabled = 0,
          two_factor_method = NULL,
          two_factor_secret = NULL,
          backup_codes = NULL
        WHERE id = ?`,
        [userId]
      );

      res.json({
        success: true,
        message: 'Two-factor authentication disabled'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }
  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disable two-factor authentication'
    });
  }
});

// Verify 2FA during login
router.post('/login-verify', async (req, res) => {
  try {
    const { email, code, backupCode } = req.body;

    const user = await req.db.get(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (!user || !user.two_factor_enabled) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request'
      });
    }

    let isValid = false;

    // Check backup code first
    if (backupCode && user.backup_codes) {
      const backupCodes = JSON.parse(user.backup_codes);
      if (backupCodes.includes(backupCode)) {
        isValid = true;
        
        // Remove used backup code
        const updatedCodes = backupCodes.filter(c => c !== backupCode);
        await req.db.run(
          'UPDATE users SET backup_codes = ? WHERE id = ?',
          [JSON.stringify(updatedCodes), user.id]
        );
      }
    } else if (code) {
      if (user.two_factor_method === 'app') {
        isValid = speakeasy.totp.verify({
          secret: user.two_factor_secret,
          encoding: 'base32',
          token: code,
          window: 2
        });
      }
      // Add SMS/Email verification logic here
    }

    if (isValid) {
      // Generate auth token
      const token = require('jsonwebtoken').sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }
  } catch (error) {
    console.error('2FA login verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Verification failed'
    });
  }
});

module.exports = router;