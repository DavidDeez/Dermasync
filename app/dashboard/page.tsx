'use client';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, Link as LinkIcon, Sparkles, AlertTriangle, ShieldAlert, ShieldCheck, Activity } from 'lucide-react';

export default function Home() {
  const [url, setUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileToBase64 = (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_DIM = 256;
          
          if (width > height && width > MAX_DIM) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          } else if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = error => reject(error);
        img.src = event.target?.result as string;
      };
      reader.onerror = error => reject(error);
    });
  };

  // Score counter animation state
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    if (result && result.safetyScore) {
      const target = result.safetyScore;
      let current = 0;
      const step = Math.max(1, Math.floor(target / 30));
      const interval = setInterval(() => {
        current += step;
        if (current >= target) {
          setDisplayScore(target);
          clearInterval(interval);
        } else {
          setDisplayScore(current);
        }
      }, 30);
      return () => clearInterval(interval);
    }
  }, [result]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoPreview(URL.createObjectURL(file));
      setPhotoUploaded(true);
      const b64 = await fileToBase64(file);
      setBase64Image(b64);
    }
  };

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            setPhotoPreview(URL.createObjectURL(file));
            setPhotoUploaded(true);
            const b64 = await fileToBase64(file);
            setBase64Image(b64);
          }
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleAnalyze = async () => {
    if (!photoUploaded) {
      setError('Please upload or paste a photo first.');
      return;
    }
    if (!url) {
      setError('Please enter a product URL.');
      return;
    }
    
    setError('');
    setIsAnalyzing(true);
    setResult(null);
    setDisplayScore(0);

    try {
      const skinRes = await fetch('/api/analyze-skin', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Image })
      });
      if (!skinRes.ok) {
        const errText = await skinRes.text();
        throw new Error(`Analyze Skin API Failed (${skinRes.status}): ${errText.slice(0, 150)}`);
      }
      const skinProfile = await skinRes.json();

      const productRes = await fetch('/api/scrape-product', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      if (!productRes.ok) {
        const errText = await productRes.text();
        throw new Error(`Scrape API Failed (${productRes.status}): ${errText.slice(0, 150)}`);
      }
      const productData = await productRes.json();
      
      if (productData.error) throw new Error(productData.error);

      // Add a 4-second delay to let Groq's TPM rate limit bucket drain (Hackathon workaround!)
      await new Promise(resolve => setTimeout(resolve, 4000));

      const scoreRes = await fetch('/api/generate-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skinProfile, productInfo: productData.data })
      });
      if (!scoreRes.ok) {
        const errText = await scoreRes.text();
        throw new Error(`Score API Failed (${scoreRes.status}): ${errText.slice(0, 150)}`);
      }
      
      const scoreData = await scoreRes.json();
      if (scoreData.error) throw new Error(scoreData.error);
      
      setResult(scoreData);
    } catch (err: any) {
      setError(err.message || 'An error occurred during analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const containerVariants: any = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <main className="container" style={{ paddingTop: '60px', paddingBottom: '80px', minHeight: '100vh', overflow: 'hidden' }}>
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ textAlign: 'center', marginBottom: '60px' }}
      >
        <h1 style={{ fontSize: '4rem', fontWeight: 800, marginBottom: '16px', background: 'linear-gradient(to right, #60a5fa, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em' }}>
          Discover Your Match
        </h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>
          Instantly know if a skincare product is safe for your unique skin profile using advanced Computer Vision and LLMs.
        </p>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '40px', alignItems: 'start', position: 'relative' }}>
        
        {/* Glow behind grid */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 60%)', zIndex: -1, pointerEvents: 'none' }} />

        {/* LEFT COLUMN: INPUTS */}
        <motion.div variants={containerVariants} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', backdropFilter: 'blur(10px)' }}>
                  <AlertTriangle size={20} />
                  {error}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div variants={itemVariants} className="glass-panel" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, var(--primary), transparent)', opacity: 0.5 }} />
            <h2 style={{ fontSize: '1.4rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--primary)' }}>01</span> Skin Profile
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.95rem' }}>
              Upload, drop, or <strong style={{ color: '#fff' }}>CTRL+V</strong> to paste a clear selfie.
            </p>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
            
            <motion.div 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={async (e) => { 
                e.preventDefault(); 
                setIsDragging(false); 
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  const file = e.dataTransfer.files[0];
                  setPhotoPreview(URL.createObjectURL(file));
                  setPhotoUploaded(true);
                  const b64 = await fileToBase64(file);
                  setBase64Image(b64);
                }
              }}
              style={{ 
                border: `2px dashed ${photoUploaded ? 'var(--success)' : isDragging ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}`, 
                borderRadius: '16px', 
                padding: '40px 24px', 
                textAlign: 'center', 
                cursor: 'pointer', 
                background: photoUploaded ? 'rgba(16, 185, 129, 0.05)' : isDragging ? 'rgba(59, 130, 246, 0.08)' : 'rgba(0,0,0,0.2)', 
                transition: 'all 0.3s ease'
              }}
            >
              <AnimatePresence mode="wait">
                {photoUploaded ? (
                  <motion.div key="uploaded" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                    {photoPreview ? (
                      <img src={photoPreview} alt="Selfie Preview" style={{ maxWidth: '100%', maxHeight: '160px', borderRadius: '12px', objectFit: 'cover', display: 'block', margin: '0 auto 16px auto', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }} />
                    ) : (
                      <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📸</div>
                    )}
                    <div style={{ color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <ShieldCheck size={18} /> Selfie Verified
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <UploadCloud size={48} color="var(--primary)" style={{ margin: '0 auto 16px auto', opacity: 0.8 }} />
                    <span style={{ color: 'var(--primary)', fontWeight: 500 }}>Click to upload</span>, drag & drop, or paste
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>

          <motion.div variants={itemVariants} className="glass-panel" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, var(--accent), transparent)', opacity: 0.5 }} />
            <h2 style={{ fontSize: '1.4rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--accent)' }}>02</span> Product to Analyze
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.95rem' }}>
              Paste the link to the skincare product you want to buy.
            </p>
            
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <LinkIcon size={18} />
              </div>
              <input 
                type="url" 
                placeholder="https://www.sephora.com/product/..." 
                className="input-field" 
                style={{ paddingLeft: '44px' }}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', alignSelf: 'center', marginRight: '4px' }}>Try:</span>
              <button onClick={() => setUrl('https://www.sephora.com/product/the-ordinary-deciem-niacinamide-10-zinc-1-P427417')} className="pill-btn">Niacinamide Serum</button>
              <button onClick={() => setUrl('https://www.paulaschoice.com/skin-perfecting-2pct-bha-liquid-exfoliant/201.html')} className="pill-btn">Paula's Choice BHA</button>
            </div>

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-primary" 
              style={{ width: '100%', padding: '16px', fontSize: '1.1rem' }}
              onClick={handleAnalyze}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity className="animate-spin" size={20} /> Scanning Ingredients...
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={20} /> Analyze Match
                </span>
              )}
            </motion.button>
          </motion.div>
        </motion.div>

        {/* RIGHT COLUMN: RESULTS */}
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="glass-panel" style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          
          <AnimatePresence mode="wait">
            {!isAnalyzing && !result && (
              <motion.div key="empty" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.3 }} style={{ padding: '40px' }}>
                <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <Sparkles size={36} color="var(--accent)" />
                </div>
                <h2 style={{ fontSize: '1.8rem', marginBottom: '12px' }}>Ready for Analysis</h2>
                <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>Add your selfie and provide a product link to generate your highly personalized safety and compatibility score.</p>
              </motion.div>
            )}

            {isAnalyzing && (
              <motion.div key="analyzing" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.3 }}>
                <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 32px auto' }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '4px solid rgba(59, 130, 246, 0.2)', borderTopColor: 'var(--primary)' }} />
                  <motion.div animate={{ rotate: -360 }} transition={{ repeat: Infinity, duration: 3, ease: "linear" }} style={{ position: 'absolute', inset: '12px', borderRadius: '50%', border: '4px solid rgba(139, 92, 246, 0.2)', borderTopColor: 'var(--accent)' }} />
                  <Activity size={32} color="var(--primary)" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
                </div>
                <h2 style={{ fontSize: '1.8rem', marginBottom: '12px', background: 'linear-gradient(90deg, #60a5fa, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Analyzing Ingredients</h2>
                <p style={{ color: 'var(--text-muted)' }}>Cross-referencing your skin profile with Qwen 27B Reasoning...</p>
              </motion.div>
            )}

            {result && !isAnalyzing && (
              <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, staggerChildren: 0.1 }} style={{ textAlign: 'left', width: '100%' }}>
                
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", bounce: 0.5 }} style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '32px' }}>
                  <div style={{ 
                    width: '100px', height: '100px', borderRadius: '50%', 
                    background: result.isSafe ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                    color: result.isSafe ? 'var(--success)' : 'var(--danger)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    fontSize: '2.8rem', fontWeight: '800', 
                    border: `4px solid ${result.isSafe ? 'var(--success)' : 'var(--danger)'}`,
                    boxShadow: `0 0 30px ${result.isSafe ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                  }}>
                    {displayScore}
                  </div>
                  <div>
                    <h2 style={{ fontSize: '2.2rem', color: result.isSafe ? 'var(--success)' : 'var(--danger)', letterSpacing: '-0.02em', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {result.isSafe ? <><ShieldCheck size={28} /> Safe to Use</> : <><ShieldAlert size={28} /> Not Recommended</>}
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem' }}>Based on your Combination skin profile</p>
                  </div>
                </motion.div>
                
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '28px', borderRadius: '16px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '16px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={20} color="var(--accent)" /> Dermatologist Analysis
                  </h3>
                  <p style={{ color: 'var(--text-muted)', lineHeight: '1.7', fontSize: '1.05rem' }}>{result.analysis}</p>
                </motion.div>

                {result.flaggedIngredients && result.flaggedIngredients.length > 0 && (
                  <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} style={{ padding: '28px', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.02))' }}>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '16px', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertTriangle size={20} /> Flagged Ingredients
                    </h3>
                    <ul style={{ color: 'var(--text-main)', paddingLeft: '24px', lineHeight: '1.8', fontSize: '1.05rem' }}>
                      {result.flaggedIngredients.map((ing: string, i: number) => (
                        <li key={i}>{ing}</li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      </div>
    </main>
  );
}
