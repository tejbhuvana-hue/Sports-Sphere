import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { EyeIcon, EyeOffIcon } from '../components/common/Icons';

export const RegisterPage = () => {
  const [step, setStep] = useState('FORM'); // 'FORM' | 'OTP'
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    role: 'PLAYER',
    password: '',
    confirm_password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpInputRef = useRef(null);
  const { completeRegistration } = useAuth();
  const navigate = useNavigate();

  const roles = [
    { value: 'PLAYER', label: 'Player' },
    { value: 'COACH', label: 'Coach' },
    { value: 'CLUB', label: 'Club' },
    { value: 'ASSOCIATION', label: 'Association' },
    { value: 'SPONSOR', label: 'Sponsor' },
    { value: 'SCOUT', label: 'Scout' },
  ];

  // Auto-focus OTP input when entering OTP view
  useEffect(() => {
    if (step === 'OTP' && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [step]);

  // Resend countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const maskEmail = (email) => {
    if (!email || !email.includes('@')) return email;
    const [local, domain] = email.split('@');
    if (local.length <= 2) {
      return `${local.charAt(0)}***@${domain}`;
    }
    return `${local.charAt(0)}***${local.slice(-1)}@${domain}`;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authAPI.requestRegistrationOTP({
        username: formData.username.trim(),
        email: formData.email.trim(),
        role: formData.role,
        password: formData.password,
      });

      setStep('OTP');
      setOtp('');
      setError('');
      setInfoMessage(res.data?.message || 'Verification code sent to your email.');
      setResendCooldown(60);
    } catch (err) {
      setError(
        err.response?.data?.error ||
        'Registration failed. Please check your inputs.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(val);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await authAPI.verifyRegistrationOTP({
        email: formData.email.trim(),
        otp: otp.trim(),
      });

      // Successful verification: set session and navigate
      await completeRegistration(res.data.token, res.data.user);
      navigate('/feed');
    } catch (err) {
      setError(
        err.response?.data?.error ||
        'Verification failed. Please check the code and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    setError('');
    setInfoMessage('');

    try {
      const res = await authAPI.resendRegistrationOTP({
        email: formData.email.trim(),
      });

      setResendCooldown(60);
      setInfoMessage(res.data?.message || 'A new verification code has been sent to your email.');
    } catch (err) {
      if (err.response?.status === 429 && err.response?.data?.cooldown_remaining) {
        setResendCooldown(err.response.data.cooldown_remaining);
      }
      setError(
        err.response?.data?.error ||
        'Failed to resend verification code. Please try again later.'
      );
    } finally {
      setIsResending(false);
    }
  };

  const handleBackToForm = () => {
    setStep('FORM');
    setOtp('');
    setError('');
    setInfoMessage('');
  };

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 70px - var(--safe-top))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        background: 'var(--auth-bg)',
      }}
    >
      <div
        className="glass-panel"
        style={{
          maxWidth: '480px',
          width: '100%',
          padding: '36px',
          borderRadius: 'var(--border-radius)',
          boxShadow: 'var(--glass-shadow)',
        }}
      >
        {step === 'FORM' ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h2
                style={{
                  fontSize: '1.8rem',
                  fontWeight: '800',
                  color: 'var(--text-primary)',
                  marginBottom: '8px',
                }}
              >
                Create an Account
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Join the SportsSphere ecosystem
              </p>
            </div>

            {error && (
              <div
                style={{
                  background: 'rgba(255, 75, 75, 0.1)',
                  border: '1px solid rgba(255, 75, 75, 0.3)',
                  color: '#ff4d4d',
                  padding: '12px',
                  borderRadius: '8px',
                  fontSize: '0.88rem',
                  marginBottom: '20px',
                }}
              >
                {error}
              </div>
            )}

            <form
              onSubmit={handleFormSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    marginBottom: '6px',
                    color: 'var(--text-primary)',
                  }}
                >
                  Username
                </label>
                <input
                  type="text"
                  required
                  placeholder="Choose a username"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--input-border)',
                    background: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    fontSize: '0.92rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    marginBottom: '6px',
                    color: 'var(--text-primary)',
                  }}
                >
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="Enter your email address"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--input-border)',
                    background: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    fontSize: '0.92rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    marginBottom: '6px',
                    color: 'var(--text-primary)',
                  }}
                >
                  Select Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--input-border)',
                    background: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    fontSize: '0.92rem',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {roles.map((r) => (
                    <option
                      key={r.value}
                      value={r.value}
                      style={{
                        background: 'var(--card-bg)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    marginBottom: '6px',
                    color: 'var(--text-primary)',
                  }}
                >
                  Password
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    style={{
                      width: '100%',
                      padding: '10px 42px 10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--input-border)',
                      background: 'var(--input-bg)',
                      color: 'var(--text-primary)',
                      fontSize: '0.92rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-secondary)',
                      padding: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '4px',
                    }}
                  >
                    {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    marginBottom: '6px',
                    color: 'var(--text-primary)',
                  }}
                >
                  Confirm Password
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="Confirm your password"
                    value={formData.confirm_password}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirm_password: e.target.value,
                      })
                    }
                    style={{
                      width: '100%',
                      padding: '10px 42px 10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--input-border)',
                      background: 'var(--input-bg)',
                      color: 'var(--text-primary)',
                      fontSize: '0.92rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-secondary)',
                      padding: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '4px',
                    }}
                  >
                    {showConfirmPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '12px',
                  marginTop: '10px',
                  fontSize: '0.95rem',
                  fontWeight: '700',
                }}
              >
                {isSubmitting ? 'Sending Verification Code...' : 'Register'}
              </button>
            </form>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                margin: '20px 0',
                gap: '12px',
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: '1px',
                  background:
                    'var(--input-border, rgba(255, 255, 255, 0.15))',
                }}
              />
              <span
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                or
              </span>
              <div
                style={{
                  flex: 1,
                  height: '1px',
                  background:
                    'var(--input-border, rgba(255, 255, 255, 0.15))',
                }}
              />
            </div>

            <GoogleSignInButton
              role={formData.role}
              text={`Sign up with Google as ${roles.find((r) => r.value === formData.role)?.label || 'Player'}`}
              onSuccess={() => navigate('/feed')}
              onError={(errMsg) => setError(errMsg)}
            />

            <div
              style={{
                textAlign: 'center',
                marginTop: '24px',
                fontSize: '0.88rem',
                color: 'var(--text-secondary)',
              }}
            >
              Already have an account?{' '}
              <Link
                to="/login"
                style={{ color: 'var(--accent)', fontWeight: '700' }}
              >
                Login here
              </Link>
            </div>
          </>
        ) : (
          /* STEP 2: OTP Verification View */
          <div>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'var(--accent-bg-subtle, rgba(0, 119, 182, 0.1))',
                  color: 'var(--accent)',
                  marginBottom: '16px',
                }}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>
              <h2
                style={{
                  fontSize: '1.6rem',
                  fontWeight: '800',
                  color: 'var(--text-primary)',
                  marginBottom: '8px',
                }}
              >
                Verify Your Email
              </h2>
              <p
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.9rem',
                  lineHeight: '1.4',
                }}
              >
                A 6-digit verification code has been sent to{' '}
                <strong style={{ color: 'var(--text-primary)' }}>
                  {maskEmail(formData.email)}
                </strong>
              </p>
            </div>

            {infoMessage && (
              <div
                style={{
                  background: 'rgba(0, 119, 182, 0.1)',
                  border: '1px solid rgba(0, 119, 182, 0.3)',
                  color: 'var(--accent)',
                  padding: '12px',
                  borderRadius: '8px',
                  fontSize: '0.88rem',
                  marginBottom: '20px',
                  textAlign: 'center',
                }}
              >
                {infoMessage}
              </div>
            )}

            {error && (
              <div
                style={{
                  background: 'rgba(255, 75, 75, 0.1)',
                  border: '1px solid rgba(255, 75, 75, 0.3)',
                  color: '#ff4d4d',
                  padding: '12px',
                  borderRadius: '8px',
                  fontSize: '0.88rem',
                  marginBottom: '20px',
                  textAlign: 'center',
                }}
              >
                {error}
              </div>
            )}

            <form
              onSubmit={handleVerifyOtp}
              style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    marginBottom: '8px',
                    color: 'var(--text-primary)',
                    textAlign: 'center',
                  }}
                >
                  Enter 6-Digit Code
                </label>
                <input
                  ref={otpInputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={handleOtpChange}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '10px',
                    border: '1px solid var(--input-border)',
                    background: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    fontSize: '1.6rem',
                    fontWeight: '700',
                    letterSpacing: '0.45em',
                    textAlign: 'center',
                    outline: 'none',
                    boxShadow: 'var(--glass-shadow)',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || otp.length !== 6}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '0.95rem',
                  fontWeight: '700',
                  opacity: isSubmitting || otp.length !== 6 ? 0.6 : 1,
                  cursor:
                    isSubmitting || otp.length !== 6
                      ? 'not-allowed'
                      : 'pointer',
                }}
              >
                {isSubmitting ? 'Verifying OTP...' : 'Verify OTP'}
              </button>
            </form>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '20px',
                gap: '12px',
              }}
            >
              <button
                type="button"
                onClick={handleBackToForm}
                disabled={isSubmitting}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '0.88rem',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 0',
                }}
              >
                ← Change details
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || isResending || isSubmitting}
                style={{
                  background: 'none',
                  border: 'none',
                  color:
                    resendCooldown > 0 || isResending || isSubmitting
                      ? 'var(--text-secondary)'
                      : 'var(--accent)',
                  fontWeight: resendCooldown > 0 ? '500' : '700',
                  fontSize: '0.88rem',
                  cursor:
                    resendCooldown > 0 || isResending || isSubmitting
                      ? 'not-allowed'
                      : 'pointer',
                  padding: '6px 0',
                }}
              >
                {isResending
                  ? 'Sending...'
                  : resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : 'Resend Code'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
