const API_URL = 'http://127.0.0.1:8000/auth';

export interface TokenResponse {
    access_token: string;
    token_type: string;
    message: string;
}

export const authService = {
    async register(email: string, password: string): Promise<void> {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Registration failed');
        }
    },

    async login(email: string, password: string): Promise<TokenResponse> {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Login failed');
        }

        return response.json();
    },

    async verifyOtp(email: string, otp: string): Promise<TokenResponse> {
        const response = await fetch(`${API_URL}/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Verification failed');
        }

        return response.json();
    },

    async resendOtp(email: string): Promise<void> {
        const response = await fetch(`${API_URL}/resend-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to resend OTP');
        }
    }
};
