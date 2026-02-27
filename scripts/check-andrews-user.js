// Script to check if a specific user exists
import axios from 'axios';

const API_URL = 'http://localhost:5000';

async function checkUser() {
    try {
        // Try to login with the user credentials
        console.log('Attempting to login with user: andrews');

        const response = await axios.post(`${API_URL}/api/login`, {
            username: 'andrews',
            password: 'maracana94'
        });

        console.log('✅ Login successful!');
        console.log('User data:', response.data);
    } catch (error) {
        if (error.response) {
            console.error('❌ Login failed:', error.response.data.message);
            console.error('Status:', error.response.status);

            if (error.response.status === 401) {
                console.log('\n📝 User may not exist or password is incorrect.');
                console.log('Creating user andrews...\n');

                try {
                    const registerResponse = await axios.post(`${API_URL}/api/register`, {
                        username: 'andrews',
                        password: 'maracana94',
                        email: 'andrews@psicologia.com',
                        fullName: 'Andrews Franco',
                        role: 'admin',
                        status: 'active'
                    });

                    console.log('✅ User created successfully!');
                    console.log('User data:', registerResponse.data);
                } catch (regError) {
                    if (regError.response) {
                        console.error('❌ Registration failed:', regError.response.data.message);
                    } else {
                        console.error('❌ Error:', regError.message);
                    }
                }
            }
        } else {
            console.error('❌ Error:', error.message);
        }
    }
}

checkUser();
