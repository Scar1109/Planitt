import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { AlertTriangle, LogIn, Lock, User } from 'lucide-react';

export default function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50">
            <div className="absolute inset-0 z-0 bg-slate-50">
                {/* Decorative background pattern representing modern POS */}
                <div className="absolute top-0 -left-4 w-72 h-72 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                <div className="absolute top-0 -right-4 w-72 h-72 bg-emerald-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
            </div>

            <Card className="z-10 w-full max-w-md shadow-2xl border-slate-200/60 bg-white/90 backdrop-blur-xl">
                <CardHeader className="space-y-4 pb-6 pt-8 px-8 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg mb-2">
                        <StoreIcon className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] font-bold text-indigo-500 mb-1">Planitt</p>
                        <CardTitle className="text-3xl font-black tracking-tight text-slate-900">POS Terminal</CardTitle>
                        <CardDescription className="text-sm mt-2 text-slate-500 font-medium">
                            Sign in to access your store operations
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="px-8 pb-8">
                    <form className="space-y-5" onSubmit={handleSubmit}>
                        {error && (
                            <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-700 border border-rose-200 animate-in fade-in zoom-in duration-300">
                                <AlertTriangle className="h-4 w-4 shrink-0" />
                                <p>{error}</p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 block">Email Address</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                    <User className="h-5 w-5" />
                                </div>
                                <Input
                                    className="pl-10 h-12 bg-white border-slate-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-base"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    type="email"
                                    placeholder="Enter your email"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 block">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                    <Lock className="h-5 w-5" />
                                </div>
                                <Input
                                    className="pl-10 h-12 bg-white border-slate-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-base"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    type="password"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 text-base font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all mt-2"
                        >
                            {loading ? (
                                'Signing in...'
                            ) : (
                                <>
                                    <LogIn className="mr-2 h-5 w-5" />
                                    Access Terminal
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

function StoreIcon(props) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
    );
}
