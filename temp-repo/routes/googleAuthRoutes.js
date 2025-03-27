const express = require('express');
const router = express.Router();
const passport = require('../config/passport/google');
const { User } = require('../models');
const jwt = require('jsonwebtoken');

// Initiate Google OAuth login
router.get('/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false 
  })
);

// Google OAuth callback
router.get('/google/callback', 
  passport.authenticate('google', { 
    session: false,
    failureRedirect: '/login'
  }),
  async (req, res) => {
    try {
      // Generate JWT token
      const token = jwt.sign(
        { 
          id: req.user.id,
          email: req.user.email,
          auth_provider: 'google'
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      const refreshToken = jwt.sign(
        { id: req.user.id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      // Redirect to frontend with tokens
      res.redirect(`${process.env.FRONTEND_URL}/auth-callback?token=${token}&refreshToken=${refreshToken}`);
    } catch (error) {
      console.error('Auth callback error:', error);
      res.redirect('/login?error=authentication_failed');
    }
  }
);

// Link Google account to existing account
router.post('/link/google', async (req, res) => {
  try {
    const { googleToken } = req.body;
    // Verify Google token and link account
    // Implementation needed based on your frontend integration
    res.json({ message: 'Google account linked successfully' });
  } catch (error) {
    console.error('Google link error:', error);
    res.status(400).json({ message: 'Failed to link Google account' });
  }
});

module.exports = router;
