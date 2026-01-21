import React, { useState, useEffect } from 'react';
import { CheckCircle, Loader2, Shield, RefreshCw } from 'lucide-react';
import { authService } from '../../services/authService';

interface OTPVerificationProps {
    email: string;
    onVerifySuccess: (token: string) => void;
    onBackToLogin: () => void;
}

export const OTPVerification: React.FC<OTPVerificationProps> = ({ email, onVerifySuccess, onBackToLogin }) => {
    const [otp, setOtp] = useState(['', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [timer, setTimer] = useState(300); // 5 minutes
    const [canResend, setCanResend] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (timer > 0) {
            interval = setInterval(() => setTimer((t) => t - 1), 1000);
        } else {
            setCanResend(true);
        }
        return () => clearInterval(interval);
    }, [timer]);

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
            onVerifySuccess(response.access_token);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        setResendLoading(true);
        setError('');
        try {
            await authService.resendOtp(email);
            setTimer(300);
            setCanResend(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setResendLoading(false);
        }
    };

    const handleOtpChange = (index: number, value: string) => {
        if (value.length > 1) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        if (value && index < 3) {
            document.getElementById(`otp-${index + 1}`)?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            document.getElementById(`otp-${index - 1}`)?.focus();
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl animate-fade-in relative z-10">
            <div className="flex flex-col items-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-tr from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-green-500/30">
                    <Shield className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white">Verify Email</h1>
                <p className="text-white/40 text-sm mt-2 text-center">
                    We've sent a code to <br /><span className="text-white font-medium">{email}</span>
                </p>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-6">
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
                            className="w-14 h-16 bg-black/20 border border-white/10 rounded-xl text-center text-2xl font-bold focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-all caret-green-500"
                        />
                    ))}
                </div>

                <div className="flex justify-center">
                    <div className="text-xs font-mono text-white/40 bg-white/5 px-3 py-1 rounded-full flex items-center gap-2">
                        {canResend ? (
                            <button type="button" onClick={handleResend} disabled={resendLoading} className="text-green-400 hover:text-green-300 flex items-center gap-1">
                                {resendLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Resend Code
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
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold py-4 rounded-xl hover:opacity-90 focus:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/25 disabled:opacity-70"
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Verify Account <CheckCircle className="w-5 h-5" /></>}
                </button>
            </form>

            <div className="mt-6 text-center">
                <button onClick={onBackToLogin} className="text-white/40 hover:text-white text-sm transition-colors">
                    Back to Login
                </button>
            </div>
        </div>
    );
};
