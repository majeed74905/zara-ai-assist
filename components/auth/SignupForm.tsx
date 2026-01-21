import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, Loader2, Shield } from 'lucide-react';
import { authService } from '../../services/authService';

interface SignupFormProps {
    onSignupSuccess: (email: string) => void;
    onSwitchToLogin: () => void;
}

export const SignupForm: React.FC<SignupFormProps> = ({ onSignupSuccess, onSwitchToLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            await authService.register(email, password);
            onSignupSuccess(email);
        } catch (err: any) {
            if (err.message.includes("registered")) {
                // If already registered but verify needed, handle it? 
                // For now just show error
                setError(err.message);
            } else {
                setError(err.message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl animate-fade-in relative z-10">
            <div className="flex flex-col items-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-purple-500/30">
                    <Shield className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white">Create Account</h1>
                <p className="text-white/40 text-sm mt-2">Join Zara AI Assist Today</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">Email</label>
                    <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-purple-400 transition-colors" />
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@example.com"
                            className="w-full bg-black/20 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">Password</label>
                    <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-purple-400 transition-colors" />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Create a password"
                            className="w-full bg-black/20 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                            required
                            minLength={6}
                        />
                    </div>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-xl flex items-center gap-2">
                        <Shield className="w-4 h-4" /> {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-4 rounded-xl hover:opacity-90 focus:scale-[0.98] transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed mt-4 shadow-lg shadow-purple-500/25"
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Sign Up <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}
                </button>
            </form>

            <div className="mt-6 text-center">
                <p className="text-white/40 text-sm">
                    Already have an account?{' '}
                    <button onClick={onSwitchToLogin} className="text-purple-400 hover:text-purple-300 font-bold transition-colors">
                        Login here
                    </button>
                </p>
            </div>
        </div>
    );
};
