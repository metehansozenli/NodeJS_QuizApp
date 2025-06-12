// Controller for authentication logic
const db = require('../config/db_config');
const bcrypt = require('bcrypt');
const tokenHelper = require('../utils/tokenHelper');

exports.register = async (req, res) => {
  try {
    const { username, password, role } = req.body;

    // Validate input
    if (!username || !password || !role) {
      return res.status(401).json({ error: 'All fields (username, password, role) are required' });
    }

    // Validate role - map frontend roles to database roles
    const validRoles = { 'player': 'user', 'host': 'host' };
    if (!Object.keys(validRoles).includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be either "player" or "host"' });
    }
    
    // Map role to database format
    const dbRole = validRoles[role];

    // Check if the user already exists
    const userExists = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'User with this username already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new user into the database with explicit role
    const result = await db.query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role',
      [username, hashedPassword, dbRole]
    );

    const newUser = result.rows[0];

    // Generate token with original frontend role
    const token = tokenHelper.generateToken({ 
      id: newUser.id, 
      username: newUser.username, 
      role: role // Use original frontend role for token
    });

    res.status(201).json({ 
      message: 'User registered successfully',
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        role: role // Use original frontend role for response
      }
    });
  } catch (error) {
    console.error('Error during user registration:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check if the user exists
    const userResult = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userResult.rows[0];

    // Compare the password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Map database role back to frontend role
    const frontendRole = user.role === 'user' ? 'player' : user.role;
    
    // Generate token
    const token = tokenHelper.generateToken({ 
      id: user.id, 
      username: user.username, 
      role: frontendRole 
    });

    res.status(200).json({ 
      message: 'Login successful', 
      token,
      user: {
        id: user.id,
        username: user.username,
        role: frontendRole
      }
    });
  } catch (error) {
    console.error('Error during user login:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};
