require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const createAdmin = async () => {
    try {
        console.log('Starting admin creation process...');
        
        // Create MySQL connection
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        console.log('Database connected successfully');

        // Check if admins table exists, if not create it
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS admins (
                id INT PRIMARY KEY AUTO_INCREMENT,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                role ENUM('superadmin', 'admin', 'support') DEFAULT 'admin',
                permissions JSON,
                lastLogin DATETIME,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Check for existing superadmin
        const [existingAdmins] = await connection.execute(
            'SELECT * FROM admins WHERE role = ?',
            ['superadmin']
        );

        if (existingAdmins.length > 0) {
            console.log('Superadmin already exists');
            await connection.end();
            return;
        }

        console.log('Creating new superadmin...');
        const hashedPassword = await bcrypt.hash('YourInitialSecurePassword123!', 10);
        const permissions = JSON.stringify([
            'view_users',
            'edit_users',
            'view_transactions',
            'manage_games',
            'view_reports',
            'manage_support',
            'manage_admins'
        ]);

        await connection.execute(
            'INSERT INTO admins (email, password, name, role, permissions) VALUES (?, ?, ?, ?, ?)',
            ['dpommo@gmail.com', hashedPassword, 'David Pomroy', 'superadmin', permissions]
        );

        console.log('Superadmin created successfully');
        await connection.end();
    } catch (error) {
        console.error('Error creating admin:', error);
    }
};

createAdmin();
