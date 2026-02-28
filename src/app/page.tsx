"use client";

import Image from "next/image";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberLogin, setRememberLogin] = useState(false);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "#e0a080";
    e.target.style.boxShadow = "0 0 0 3px rgba(232, 93, 69, 0.10)";
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "#e2e2e6";
    e.target.style.boxShadow = "none";
  };

  return (
    <>
      {/* Responsive styles embedded directly so they survive file reversions */}
      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { height: 100%; width: 100%; }
        body {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          -webkit-font-smoothing: antialiased;
          background: linear-gradient(145deg, #f2f0ed 0%, #eae8e5 50%, #e8e6e3 100%);
        }

        .login-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .login-card {
          display: flex;
          width: 100%;
          max-width: 960px;
          min-height: 600px;
          background: #ffffff;
          border-radius: 24px;
          overflow: hidden;
          box-shadow:
            0 30px 80px rgba(0,0,0,0.08),
            0 12px 32px rgba(0,0,0,0.05),
            0 0 0 1px rgba(0,0,0,0.02);
        }

        .art-panel {
          position: relative;
          width: 42%;
          flex-shrink: 0;
          margin: 12px;
          border-radius: 18px;
          overflow: hidden;
          background: #e8e6e3;
        }

        .form-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 52px;
        }

        .form-inner {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
          max-width: 380px;
        }

        /* Tablet */
        @media (max-width: 768px) {
          .login-wrapper { padding: 16px; }
          .login-card {
            flex-direction: column;
            max-width: 500px;
            min-height: auto;
            border-radius: 20px;
          }
          .art-panel {
            width: auto;
            height: 220px;
            margin: 10px 10px 0 10px;
            border-radius: 14px;
          }
          .form-panel { padding: 32px 28px 36px; }
          .form-inner { max-width: 100%; }
        }

        /* Phone */
        @media (max-width: 480px) {
          .login-wrapper { padding: 8px; }
          .login-card { border-radius: 16px; }
          .art-panel {
            height: 170px;
            margin: 8px 8px 0 8px;
            border-radius: 12px;
          }
          .form-panel { padding: 24px 20px 28px; }
          .form-panel h1 { font-size: 22px !important; }
          .form-panel .subtitle { font-size: 12px !important; }
        }
      `}</style>

      <div className="login-wrapper">
        <div className="login-card">
          {/* ===== LEFT - Artwork ===== */}
          <div className="art-panel">
            <Image
              src="/login-artwork.png"
              alt="Decorative artwork"
              fill
              style={{ objectFit: "cover" }}
              priority
            />
          </div>

          {/* ===== RIGHT - Login Form ===== */}
          <div className="form-panel">
            {/* Logo */}
            <div style={{ marginBottom: "28px" }}>
              <Image
                src="/logo_main.png"
                alt="Miraee Logo"
                width={150}
                height={48}
                style={{ objectFit: "contain" }}
                priority
              />
            </div>

            {/* Heading */}
            <h1
              style={{
                fontSize: "28px",
                fontWeight: 700,
                color: "#1a1a2e",
                textAlign: "center",
                lineHeight: 1.2,
                letterSpacing: "-0.02em",
                marginBottom: "8px",
              }}
            >
              Login to your account
            </h1>
            <p
              className="subtitle"
              style={{
                fontSize: "14px",
                color: "#999",
                textAlign: "center",
                fontWeight: 400,
                marginBottom: "32px",
                lineHeight: 1.5,
              }}
            >
              Welcome back! Enter your details to log in to your account
            </p>

            {/* Form */}
            <form
              onSubmit={(e) => e.preventDefault()}
              className="form-inner"
            >
              {/* Email */}
              <label
                htmlFor="email"
                style={{ fontSize: "13px", fontWeight: 500, color: "#555", marginBottom: "2px" }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: "100%",
                  padding: "13px 16px",
                  fontSize: "14px",
                  border: "1.5px solid #e2e2e6",
                  borderRadius: "10px",
                  outline: "none",
                  color: "#1a1a2e",
                  background: "#fff",
                  transition: "all 0.2s ease",
                  fontFamily: "inherit",
                  marginBottom: "12px",
                }}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />

              {/* Password */}
              <label
                htmlFor="password"
                style={{ fontSize: "13px", fontWeight: 500, color: "#555", marginBottom: "2px" }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="Enter your Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "13px 16px",
                  fontSize: "14px",
                  border: "1.5px solid #e2e2e6",
                  borderRadius: "10px",
                  outline: "none",
                  color: "#1a1a2e",
                  background: "#fff",
                  transition: "all 0.2s ease",
                  fontFamily: "inherit",
                }}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />

              {/* Remember + Forgot */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "6px",
                  marginBottom: "8px",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "7px",
                    fontSize: "13px",
                    color: "#666",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={rememberLogin}
                    onChange={(e) => setRememberLogin(e.target.checked)}
                    style={{
                      width: "15px",
                      height: "15px",
                      accentColor: "#e85d45",
                      cursor: "pointer",
                    }}
                  />
                  Remember login
                </label>
                <a
                  href="#"
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#e85d45",
                    textDecoration: "underline",
                    textUnderlineOffset: "2px",
                  }}
                >
                  Forget Password?
                </a>
              </div>

              {/* Orange Login Button */}
              <button
                type="submit"
                id="login-button"
                style={{
                  width: "100%",
                  padding: "14px",
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "#ffffff",
                  background: "linear-gradient(135deg, #e85d45 0%, #e04a32 100%)",
                  border: "none",
                  borderRadius: "12px",
                  cursor: "pointer",
                  transition: "all 0.25s ease",
                  fontFamily: "inherit",
                  letterSpacing: "0.02em",
                  boxShadow: "0 4px 14px rgba(232, 93, 69, 0.3)",
                  marginTop: "4px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 6px 22px rgba(232, 93, 69, 0.45)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 4px 14px rgba(232, 93, 69, 0.3)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                Login
              </button>

              {/* Divider */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  margin: "16px 0",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    height: "1px",
                    background: "linear-gradient(90deg, transparent, #e0e0e0, transparent)",
                  }}
                />
                <span style={{ fontSize: "12px", color: "#bbb" }}>
                  Or continue with
                </span>
                <div
                  style={{
                    flex: 1,
                    height: "1px",
                    background: "linear-gradient(90deg, transparent, #e0e0e0, transparent)",
                  }}
                />
              </div>

              {/* Sign in with Apple */}
              <button
                type="button"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  width: "100%",
                  padding: "12px",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#1a1a2e",
                  background: "#f4f4f5",
                  border: "none",
                  borderRadius: "10px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#eaeaec"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#f4f4f5"; }}
              >
                <svg width="18" height="18" fill="#1a1a2e" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                Sign in with Apple
              </button>

              {/* Sign in with Google */}
              <button
                type="button"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  width: "100%",
                  padding: "12px",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#1a1a2e",
                  background: "#f4f4f5",
                  border: "none",
                  borderRadius: "10px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#eaeaec"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#f4f4f5"; }}
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

            {/* Create Account */}
            <p
              style={{
                textAlign: "center",
                fontSize: "13px",
                color: "#999",
                marginTop: "24px",
              }}
            >
              New here?{" "}
              <a
                href="#"
                style={{
                  color: "#e85d45",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Create account
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
