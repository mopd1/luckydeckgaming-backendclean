// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { User } = require('../models');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/auth');

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ where: { username } });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // --- Corrected User Object in Response ---
    return res.json({
      token,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        balance: user.balance,
        gems: user.gems,
        action_points: user.action_points || 0, // ADDED: Include action_points (default to 0 if null/undefined)
        display_name: user.display_name || user.username,
        welcome_completed: user.welcome_completed || false,
        avatar_data: user.avatar_data,
        owned_avatar_parts: user.owned_avatar_parts,
        language_preference: user.language_preference || 'en'
      }
    });
    // -----------------------------------------
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Basic validation
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required' });
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Create new user - we don't need to explicitly hash the password
    // as the User model has hooks that will automatically hash it
    const newUser = await User.create({
      username,
      email,
      password,
      balance: 1000000,  // Give new users a starting balance
      gems: 10000,       // Give new users some starting gems
      is_active: true,
      is_admin: false,
      display_name: username,  // Use username as initial display_name
      welcome_completed: false
    });

    // Return success response
    return res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        balance: newUser.balance,
        gems: newUser.gems,
        display_name: newUser.display_name
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.name === 'SequelizeValidationError') {
      // Handle validation errors (e.g., invalid email format)
      return res.status(400).json({
        message: 'Validation error',
        errors: error.errors.map(e => e.message)
      });
    }
    return res.status(500).json({ message: 'Server error during registration' });
  }
});

// PUT /auth/mark-welcome-completed
router.put('/mark-welcome-completed', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.welcome_completed = true;
    await user.save();

    return res.json({
      success: true,
      welcome_completed: true
    });
  } catch (error) {
    console.error('Error marking welcome as completed:', error);
    return res.status(500).json({ message: 'Error updating welcome status' });
  }
});

// Debug logging middleware for every /auth route
router.use((req, res, next) => {
  console.log('Auth route request:', {
    method: req.method,
    path: req.path,
    body: req.body,
    headers: req.headers
  });
  next();
});

// PUT /auth/update-chips -- for adjusting balance (though you also have /balance route)
router.put('/update-chips', authenticateToken, async (req, res) => {
  console.log('Handling balance update request:', {
    // Avoid optional chaining: userId: req.user?.id
    // Use the older approach if you suspect hidden char issues:
    userId: req.user ? req.user.id : null,
    requestBody: req.body
  });

  try {
    const { balance } = req.body;
    if (typeof balance !== 'number' || balance < 0) {
      return res.status(400).json({ message: 'Invalid balance value' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.balance = balance;
    await user.save();

    console.log('Balance updated successfully:', {
      userId: user.id,
      newBalance: user.balance
    });

    return res.json({
      success: true,
      new_balance: user.balance,
      message: 'Balance updated successfully'
    });
  } catch (error) {
    console.error('Error updating balance:', error);
    return res.status(500).json({ message: 'Error updating balance' });
  }
});

// GET /auth/user -- fetch a single user's data
router.get('/user', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // --- Corrected User Object in Response ---
    return res.json({
      id: user.id,
      username: user.username,
      email: user.email, // Include email if needed by client
      balance: user.balance,
      gems: user.gems,
      action_points: user.action_points || 0, // ADDED: Include action_points (default to 0 if null/undefined)
      display_name: user.display_name || user.username,
      welcome_completed: user.welcome_completed || false,
      avatar_data: user.avatar_data,
      owned_avatar_parts: user.owned_avatar_parts,
      language_preference: user.language_preference || 'en'
    });
    // -----------------------------------------
  } catch (error) {
    console.error('Error fetching user data:', error);
    return res.status(500).json({ message: 'Error fetching user data' });
  }
});

router.put('/update-profile', authenticateToken, async (req, res) => {
  console.log('Handling profile update request:', {
    userId: req.user ? req.user.id : null,
    requestBody: req.body
  });

  try {
    const { name, first_name, surname, nickname, welcome_completed } = req.body;

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update name if provided
    if (name && typeof name === 'string' && name.trim()) {
      user.display_name = name.trim();
    }

    // Update individual name components if provided
    if (first_name && typeof first_name === 'string' && first_name.trim()) {
      user.first_name = first_name.trim();
    }

    if (surname && typeof surname === 'string' && surname.trim()) {
      user.surname = surname.trim();
    }

    if (nickname && typeof nickname === 'string' && nickname.trim()) {
      user.nickname = nickname.trim();
    }

    // Update welcome_completed if provided
    if (welcome_completed !== undefined) {
      user.welcome_completed = Boolean(welcome_completed);
    }

    await user.save();

    return res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      balance: user.balance,
      gems: user.gems,
      display_name: user.display_name,
      first_name: user.first_name,
      surname: user.surname,
      nickname: user.nickname,
      welcome_completed: user.welcome_completed
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({ message: 'Error updating profile' });
  }
});

// PUT /auth/update-avatar
router.put('/update-avatar', authenticateToken, async (req, res) => {
  console.log('Handling avatar update request:', {
    userId: req.user ? req.user.id : null,
    requestBody: req.body
  });

  try {
    const { avatar_data, owned_avatar_parts } = req.body;

    // Validate input
    if (!avatar_data || !owned_avatar_parts) {
      return res.status(400).json({ message: 'Missing required avatar data' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update the user's avatar data
    user.avatar_data = avatar_data;
    user.owned_avatar_parts = owned_avatar_parts;
    await user.save();

    return res.json({
      success: true,
      message: 'Avatar data updated successfully',
      avatar_data: user.avatar_data,
      owned_avatar_parts: user.owned_avatar_parts
    });
  } catch (error) {
    console.error('Error updating avatar data:', error);
    return res.status(500).json({ message: 'Error updating avatar data' });
  }
});

// PUT /auth/language - Update user language preference
router.put('/language', authenticateToken, async (req, res) => {
  try {
    console.log("Language update request received");
    console.log("User ID:", req.user.id);
    console.log("Request body:", req.body);
    
    const { language } = req.body;
    
    // Validate language code
    const validLanguages = ['en', 'pt_BR', 'es', 'id', 'ms', 'fr', 'de', 'th', 'zh_CN', 'zh_TW', 'vi', 'tr'];
    if (!language || !validLanguages.includes(language)) {
      return res.status(400).json({ message: 'Invalid language code' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log("Updating language from", user.language_preference, "to", language);
    
    // Update language preference
    user.language_preference = language;
    await user.save();
    
    console.log("Language updated successfully");

    return res.json({
      success: true,
      language_preference: language
    });
  } catch (error) {
    console.error('Error updating language:', error);
    return res.status(500).json({ message: 'Error updating language preference' });
  }
});

module.exports = router;
