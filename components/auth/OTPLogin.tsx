import React, { useState, useEffect } from 'react';
import { Mail, Lock, ArrowRight, Loader2, CheckCircle, Shield } from 'lucide-react';
import { authService } from '../../services/authService';

interface OTPLoginProps {
    onLoginSuccess: (token: string) => void;
}

export const OTPLogin: React.FC<OTPLoginProps> = ({ onLoginSuccess }) => {
    const [step, setStep] = useState<'email' | 'otp'>('email');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState(['', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [timer, setTimer] = useState(300); // 5 minutes
    const [canResend, setCanResend] = useState(false);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (step === 'otp' && timer > 0) {
            interval = setInterval(() => setTimer((t) => t - 1), 1000);
        } else if (timer === 0) {
            setCanResend(true);
        }
        return () => clearInterval(interval);
    }, [step, timer]);

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            await authService.sendOtp(email);
            setStep('otp');
            setTimer(300);
            setCanResend(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const otpString = otp.join('');
        if (otpString.length !== 4) {
            setError('Please enter the complete 4-digit code');
            setIsLoading(false);
            return;
        }

        try {
            const response = await authService.verifyOtp(email, otpString);
            onLoginSuccess(response.access_token);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOtpChange = (index: number, value: string) => {
        if (value.length > 1) return; // Prevent multiple chars

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 3) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            nextInput?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            const prevInput = document.getElementById(`otp-${index - 1}`);
            prevInput?.focus();
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white p-4 overflow-hidden relative">
            {/* Background Ambience */}
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />

            <div className="w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl relative z-10 animate-fade-in">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-tr from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-purple-500/30">
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                        Zara AI Assist
                    </h1>
                    <p className="text-white/40 text-sm mt-2">Secure Neural Authentication</p>
                </div>

                {step === 'email' ? (
                    <form onSubmit={handleSendOtp} className="space-y-6 animate-slide-up">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-purple-400 transition-colors" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@example.com"
                                    className="w-full bg-black/20 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                                    required
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
                            className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-white/90 focus:scale-[0.98] transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Continue <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-6 animate-slide-up">
                        <div className="text-center mb-2">
                            <p className="text-white/60 text-sm">Enter the code sent to</p>
                            <p className="text-white font-medium">{email}</p>
                            <button
                                type="button"
                                onClick={() => setStep('email')}
                                className="text-xs text-purple-400 hover:text-purple-300 mt-1"
                            >
                                Change email
                            </button>
                        </div>

                        <div className="flex justify-center gap-3">
                            {otp.map((digit, index) => (
                                <input
                                    key={index}
                                    id={`otp-${index}`}
                                    type="text"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleOtpChange(index, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(index, e)}
                                    className="w-14 h-16 bg-black/20 border border-white/10 rounded-xl text-center text-2xl font-bold focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all caret-purple-500"
                                />
                            ))}
                        </div>

                        <div className="flex justify-center">
                            <div className="text-xs font-mono text-white/40 bg-white/5 px-3 py-1 rounded-full">
                                {canResend ? (
                                    <button type="button" onClick={handleSendOtp} className="text-purple-400 hover:text-purple-300">
                                        Resend Code
                                    </button>
                                ) : (
                                    <span>Resend in {formatTime(timer)}</span>
                                )}
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
                            className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold py-4 rounded-xl hover:opacity-90 focus:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 disabled:opacity-70"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Verify & Access <CheckCircle className="w-5 h-5" /></>}
                        </button>
                    </form>
                )}

                <div className="mt-8 pt-6 border-t border-white/5 text-center">
                    <p className="text-xs text-white/20">
                        Protected by Zara AI Security. <br /> By continuing, you agree to our Terms of Service.
                    </p>
                </div>
            </div>
        </div>
    );
};
