'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  
  const [name, setName] = useState(''); // Idinagdag dahil may name input ka sa UI
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Direktang click execution function para lumaktaw sa form bugs
  const handleDirectClick = async () => {
    setError('');
    
    // In-include na natin ang validation para sa name kung kailangan
    if (!email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    }
  };

  return (
    <div 
      className="min-h-screen w-screen flex items-center justify-center p-4 bg-[#F5E6C4] bg-repeat bg-auto"
      style={{ backgroundImage: "url('/bg-parchment.jpg')" }}
    >
      {/* HandSpeak Card Container */}
      <div className="w-full max-w-md bg-[#F8B936]/90 backdrop-blur-sm p-8 rounded-[40px] shadow-2xl space-y-6 text-[#521903] relative z-10 border border-white/20">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black tracking-tight select-none">Login</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Faculty Access Portal</p>
        </div>
        
        <div className="space-y-4">
          {/* Name Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest pl-2">Name *</label>
            <div className="relative flex items-center">
              <User className="absolute left-4 h-4 w-4 opacity-50" />
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe" 
                className="w-full pl-11 pr-5 py-3.5 rounded-2xl bg-[#F5E6C4]/50 border border-[#521903]/10 text-sm font-bold text-[#521903] placeholder-[#521903]/40 focus:outline-none focus:ring-2 focus:ring-[#521903]/20"
              />
            </div>
          </div>

          {/* Email Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest pl-2">Email Address *</label>
            <div className="relative flex items-center">
              <Mail className="absolute left-4 h-4 w-4 opacity-50" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@handspeak.edu" 
                className="w-full pl-11 pr-5 py-3.5 rounded-2xl bg-[#F5E6C4]/50 border border-[#521903]/10 text-sm font-bold text-[#521903] placeholder-[#521903]/40 focus:outline-none focus:ring-2 focus:ring-[#521903]/20"
                required
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest pl-2">Password *</label>
            <div className="relative flex items-center">
              <Lock className="absolute left-4 h-4 w-4 opacity-50" />
              <input 
                type={showPassword ? 'text' : 'password'} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••" 
                className="w-full pl-11 pr-12 py-3.5 rounded-2xl bg-[#F5E6C4]/50 border border-[#521903]/10 text-sm font-bold text-[#521903] placeholder-[#521903]/40 focus:outline-none focus:ring-2 focus:ring-[#521903]/20"
                required
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 opacity-50 hover:opacity-100 transition-opacity"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Remember strip */}
          <div className="flex items-center justify-between text-[10px] font-black pt-1 px-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" className="accent-[#521903] h-3.5 w-3.5 rounded" />
              Remember Me
            </label>
            <span className="text-[#521903]/80 hover:underline cursor-pointer">Forgot Password?</span>
          </div>

          {error && (
            <p className="text-[10px] font-black text-rose-900 text-center bg-rose-200/50 p-2.5 rounded-xl">
              ⚠️ {error}
            </p>
          )}

          {/* Isolated Button Zone */}
          <button 
            type="button"
            onClick={handleDirectClick}
            disabled={isLoading}
            className="w-full bg-[#521903] hover:bg-[#3D1202] text-white font-black py-4 rounded-2xl shadow-lg text-xs uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? 'Processing...' : 'Login'}
          </button>
        </div>

        <p className="text-center text-[10px] font-black cursor-pointer hover:underline pt-2 select-none opacity-70">
          Create New Account (Faculty Request)
        </p>
      </div>
    </div>
  );
}