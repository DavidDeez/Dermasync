'use client';
import React, { useState } from 'react';

export default function Login() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <main className="container animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 80px)' }}>
      <div className="glass-panel" style={{ maxWidth: '400px', width: '100%', padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Welcome Back</h1>
          <p style={{ color: 'var(--text-muted)' }}>Sign in to access your skin profile</p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); window.location.href = '/dashboard'; }} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Email Address</label>
            <input type="email" placeholder="you@example.com (optional)" className="input-field" />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Password</label>
            <input type="password" placeholder="•••••••• (optional)" className="input-field" />
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            style={{ 
              marginTop: '12px', 
              padding: '14px', 
              fontSize: '1rem',
              transform: isHovered ? 'translateY(-2px)' : 'none',
              boxShadow: isHovered ? '0 8px 20px rgba(59, 130, 246, 0.4)' : 'none'
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            Sign In
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Don't have an account? <span style={{ color: 'var(--primary)', cursor: 'pointer' }}>Sign up</span>
        </div>
      </div>
    </main>
  );
}
