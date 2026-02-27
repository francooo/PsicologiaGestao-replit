// Script to create a default admin user via API
import axios from 'axios';

const API_URL = 'http://localhost:5000';

async function createAdminUser() {
    try {
        console.log('Creating admin user...');

        const response = await axios.post(`${API_URL}/api/register`, {
            username: 'admin',
            password: 'admin123',
            email: 'admin@psicologia.com',
            fullName: 'Administrador',
            role: 'admin',
            status: 'active'
        });

        console.log('✅ Admin user created successfully!');
        console.log('Username: admin');
        console.log('Password: admin123');
        console.log('User data:', response.data);
    } catch (error) {
        if (error.response) {
            console.error('❌ Error:', error.response.data.message);
        } else {
            console.error('❌ Error:', error.message);
        }
    }
}

createAdminUser();
