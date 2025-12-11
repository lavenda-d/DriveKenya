const express = require('express');
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const crypto = require('crypto');
const router = express.Router();

// Relying Party (RP) Information
const rpName = 'DriveKenya';
const rpID = process.env.RP_ID || 'localhost';
const origin = process.env.ORIGIN || `https://${rpID}`;

// Check biometric registration status
router.get('/status', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const credentials = await req.db.all(
      'SELECT * FROM user_authenticators WHERE user_id = ?',
      [userId]
    );

    res.json({
      success: true,
      isRegistered: credentials.length > 0,
      credentialCount: credentials.length
    });
  } catch (error) {
    console.error('Biometric status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check biometric status'
    });
  }
});

// Begin biometric registration
router.post('/register/begin', async (req, res) => {
  try {
    const user = req.user;
    
    // Get existing authenticators for the user
    const userAuthenticators = await req.db.all(
      'SELECT * FROM user_authenticators WHERE user_id = ?',
      [user.id]
    );

    const options = generateRegistrationOptions({
      rpName,
      rpID,
      userID: user.id.toString(),
      userName: user.email,
      userDisplayName: `${user.first_name} ${user.last_name}`,
      timeout: 60000,
      attestationType: 'none',
      excludeCredentials: userAuthenticators.map(authenticator => ({
        id: Buffer.from(authenticator.credential_id, 'base64'),
        type: 'public-key',
        transports: JSON.parse(authenticator.transports || '[]'),
      })),
      authenticatorSelection: {
        residentKey: 'discouraged',
        userVerification: 'preferred',
      },
      supportedAlgorithmIDs: [-7, -257],
    });

    // Store challenge temporarily
    await req.db.run(
      `UPDATE users SET 
        current_challenge = ?,
        challenge_expires = ?
      WHERE id = ?`,
      [
        options.challenge,
        new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
        user.id
      ]
    );

    res.json({
      success: true,
      options
    });
  } catch (error) {
    console.error('Biometric registration begin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to begin biometric registration'
    });
  }
});

// Complete biometric registration
router.post('/register/finish', async (req, res) => {
  try {
    const { credential } = req.body;
    const user = req.user;

    // Get stored challenge
    const userData = await req.db.get(
      'SELECT current_challenge, challenge_expires FROM users WHERE id = ?',
      [user.id]
    );

    if (!userData.current_challenge) {
      return res.status(400).json({
        success: false,
        message: 'No registration in progress'
      });
    }

    // Check if challenge is expired
    const now = new Date();
    const expiresAt = new Date(userData.challenge_expires);
    if (now > expiresAt) {
      return res.status(400).json({
        success: false,
        message: 'Registration challenge expired'
      });
    }

    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: userData.current_challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (verification.verified && verification.registrationInfo) {
      const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;

      // Store authenticator
      await req.db.run(
        `INSERT INTO user_authenticators (
          user_id, credential_id, public_key, counter, transports, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          user.id,
          Buffer.from(credentialID).toString('base64'),
          Buffer.from(credentialPublicKey).toString('base64'),
          counter,
          JSON.stringify(credential.response.transports || []),
          new Date().toISOString()
        ]
      );

      // Clear challenge
      await req.db.run(
        'UPDATE users SET current_challenge = NULL, challenge_expires = NULL WHERE id = ?',
        [user.id]
      );

      res.json({
        success: true,
        message: 'Biometric authentication registered successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Registration verification failed'
      });
    }
  } catch (error) {
    console.error('Biometric registration finish error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete biometric registration'
    });
  }
});

// Begin biometric authentication
router.post('/authenticate/begin', async (req, res) => {
  try {
    // Get all authenticators (for demonstration - in production you might want to limit this)
    const authenticators = await req.db.all(
      'SELECT * FROM user_authenticators'
    );

    const options = generateAuthenticationOptions({
      timeout: 60000,
      allowCredentials: authenticators.map(authenticator => ({
        id: Buffer.from(authenticator.credential_id, 'base64'),
        type: 'public-key',
        transports: JSON.parse(authenticator.transports || '[]'),
      })),
      userVerification: 'preferred',
      rpID,
    });

    // Store challenge in session/cache (simplified for demo)
    global.authChallenge = options.challenge;
    global.authChallengeExpires = Date.now() + 5 * 60 * 1000; // 5 minutes

    res.json({
      success: true,
      options
    });
  } catch (error) {
    console.error('Biometric authentication begin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to begin biometric authentication'
    });
  }
});

// Complete biometric authentication
router.post('/authenticate/finish', async (req, res) => {
  try {
    const { credential } = req.body;

    if (!global.authChallenge) {
      return res.status(400).json({
        success: false,
        message: 'No authentication in progress'
      });
    }

    // Check if challenge is expired
    if (Date.now() > global.authChallengeExpires) {
      return res.status(400).json({
        success: false,
        message: 'Authentication challenge expired'
      });
    }

    // Find authenticator
    const authenticator = await req.db.get(
      'SELECT * FROM user_authenticators WHERE credential_id = ?',
      [Buffer.from(credential.rawId, 'base64').toString('base64')]
    );

    if (!authenticator) {
      return res.status(400).json({
        success: false,
        message: 'Authenticator not found'
      });
    }

    // Get user
    const user = await req.db.get(
      'SELECT * FROM users WHERE id = ?',
      [authenticator.user_id]
    );

    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: global.authChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: Buffer.from(authenticator.credential_id, 'base64'),
        credentialPublicKey: Buffer.from(authenticator.public_key, 'base64'),
        counter: authenticator.counter,
      },
    });

    if (verification.verified) {
      // Update counter
      await req.db.run(
        'UPDATE user_authenticators SET counter = ?, last_used = ? WHERE id = ?',
        [
          verification.authenticationInfo.newCounter,
          new Date().toISOString(),
          authenticator.id
        ]
      );

      // Generate auth token
      const token = require('jsonwebtoken').sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Clear challenge
      global.authChallenge = null;
      global.authChallengeExpires = null;

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
        message: 'Authentication verification failed'
      });
    }
  } catch (error) {
    console.error('Biometric authentication finish error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete biometric authentication'
    });
  }
});

// Remove biometric authenticator
router.post('/remove', async (req, res) => {
  try {
    const userId = req.user.id;

    await req.db.run(
      'DELETE FROM user_authenticators WHERE user_id = ?',
      [userId]
    );

    res.json({
      success: true,
      message: 'Biometric authentication removed'
    });
  } catch (error) {
    console.error('Biometric removal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove biometric authentication'
    });
  }
});

module.exports = router;