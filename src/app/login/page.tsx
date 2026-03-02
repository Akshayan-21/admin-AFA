"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { loginSchema } from "@/lib/validations";
import AuthLayout, {
  inputStyle,
  btnPrimary,
  handleFocus,
  handleBlur,
  btnHoverEnter,
  btnHoverLeave,
} from "@/components/AuthLayout";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberLogin, setRememberLogin] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      loginSchema.parse({ email, password });
      setErrors({});
      router.push("/chat");
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: { email?: string; password?: string } = {};
        error.errors.forEach((err) => {
          if (err.path[0] === "email") newErrors.email = err.message;
          if (err.path[0] === "password") newErrors.password = err.message;
        });
        setErrors(newErrors);
      }
    }
  };

  return (
    <AuthLayout>
      {/* Logo */}
      <div className="mb-7">
        <Image
          src="/logo_main.png"
          alt="Miraee Logo"
          width={150}
          height={48}
          className="object-contain"
          priority
        />
      </div>

      {/* Heading */}
      <h1 className="text-[28px] max-sm:text-[22px] font-bold text-[#1a1a2e] text-center leading-tight tracking-[-0.02em] mb-2">
        Login to your account
      </h1>
      <p className="text-sm max-sm:text-xs text-[#999] text-center font-normal mb-8 leading-relaxed">
        Welcome back! Enter your details to log in to your account
      </p>

      {/* Form */}
      <form onSubmit={handleLogin} className="flex flex-col gap-2 w-full max-w-[380px] max-md:max-w-full">
        {/* Email */}
        <label htmlFor="email" className="text-[13px] font-medium text-[#555] mb-0.5">
          Email
        </label>
        <input
          id="email"
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors({ ...errors, email: undefined }); }}
          style={{ ...inputStyle, marginBottom: errors.email ? "4px" : "12px", borderColor: errors.email ? "#ef4444" : "#e5e5ed" }}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {errors.email && <span className="text-[#ef4444] text-[11px] mb-2 block">{errors.email}</span>}

        {/* Password */}
        <label htmlFor="password" className="text-[13px] font-medium text-[#555] mb-0.5">
          Password
        </label>
        <input
          id="password"
          type="password"
          placeholder="Enter your Password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors({ ...errors, password: undefined }); }}
          style={{ ...inputStyle, borderColor: errors.password ? "#ef4444" : "#e5e5ed", marginBottom: errors.password ? "4px" : "0" }}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {errors.password && <span className="text-[#ef4444] text-[11px] block mt-1">{errors.password}</span>}

        {/* Remember + Forgot */}
        <div className="flex justify-between items-center mt-1.5 mb-2">
          <label className="flex items-center gap-[7px] text-[13px] text-[#666] cursor-pointer">
            <input
              type="checkbox"
              checked={rememberLogin}
              onChange={(e) => setRememberLogin(e.target.checked)}
              className="w-[15px] h-[15px] accent-[#e85d45] cursor-pointer"
            />
            Remember login
          </label>
          <button
            type="button"
            onClick={() => router.push("/forgot-password")}
            className="bg-transparent border-none text-[13px] font-medium text-[#e85d45] underline underline-offset-2 cursor-pointer font-[inherit]"
          >
            Forget Password?
          </button>
        </div>

        {/* Login Button */}
        <button
          type="submit"
          id="login-button"
          style={btnPrimary}
          onMouseEnter={btnHoverEnter}
          onMouseLeave={btnHoverLeave}
        >
          Login
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3.5 my-4">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#e0e0e0] to-transparent" />
          <span className="text-xs text-[#bbb]">Or continue with</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#e0e0e0] to-transparent" />
        </div>

        {/* Microsoft */}
        <button
          type="button"
          className="flex items-center justify-center gap-2.5 w-full p-3 text-sm font-medium text-[#1a1a2e] bg-[#f4f4f5] border-none rounded-[10px] cursor-pointer transition-all duration-200 font-[inherit] hover:bg-[#eaeaec]"
        >
          <svg width="18" height="18" viewBox="0 0 23 23">
            <rect x="1" y="1" width="10" height="10" fill="#f25022"/>
            <rect x="12" y="1" width="10" height="10" fill="#7fba00"/>
            <rect x="1" y="12" width="10" height="10" fill="#00a4ef"/>
            <rect x="12" y="12" width="10" height="10" fill="#ffb900"/>
          </svg>
          Sign in with Microsoft
        </button>

        {/* Google */}
        <button
          type="button"
          className="flex items-center justify-center gap-2.5 w-full p-3 text-sm font-medium text-[#1a1a2e] bg-[#f4f4f5] border-none rounded-[10px] cursor-pointer transition-all duration-200 font-[inherit] hover:bg-[#eaeaec]"
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
            <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
            <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
            <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
          </svg>
          Sign in with Google
        </button>
      </form>
    </AuthLayout>
  );
}
