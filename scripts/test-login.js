// Test login directly
import axios from 'axios';

const API_URL = 'http://localhost:5000';

async function testLogin() {
    try {
        console.log('Testing login with andrews/maracana94...');

        const response = await axios.post(`${API_URL}/api/login`, {
            username: 'andrews',
            password: 'maracana94'
        }, {
            withCredentials: true,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Login successful!');
        console.log('Response:', response.data);
        console.log('Status:', response.status);
    } catch (error) {
        console.error('❌ Login failed');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
}

testLogin();
