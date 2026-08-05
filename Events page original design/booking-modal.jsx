// Multi-step booking modal: party size → details → pay-or-hold → (payment) → confirmation
function BookingModal({open, onClose, tablesLeft, onBooked, initialStep = 0, initialName = '', initialMobile = '', initialPax = 4, theme, variant = 'sheet'}) {
  const BC = (window.AkanThemes && window.AkanThemes[theme]) || window.AkanColors;
  const isDialog = variant === 'dialog';
  const [step, setStep] = React.useState(initialStep);
  const [pax, setPax] = React.useState(initialPax);
  const [name, setName] = React.useState(initialName);
  const [mobile, setMobile] = React.useState(initialMobile);
  const [errors, setErrors] = React.useState({});
  const [submitting, setSubmitting] = React.useState(false);
  const [paid, setPaid] = React.useState(false);
  const [payMethod, setPayMethod] = React.useState('upi');

  const earlyBird = 50;
  const fullCover = 1500;

  React.useEffect(() => {
    if (!open) {
      setTimeout(() => { setStep(initialStep); setName(initialName); setMobile(initialMobile); setErrors({}); setPaid(false); }, 300);
    }
  }, [open]);

  function validate() {
    const e = {};
    if (name.trim().length < 2) e.name = 'Please enter your full name';
    if (!/^[6-9]\d{9}$/.test(mobile.replace(/\D/g, ''))) e.mobile = 'Enter a valid 10-digit Indian mobile';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function gotoOffer() {
    if (!validate()) return;
    setStep(2);
  }

  function holdOnly() {
    setSubmitting(true);
    setTimeout(() => { setSubmitting(false); setPaid(false); setStep(4); onBooked && onBooked(); }, 700);
  }

  function payNow() {
    setStep(3);
  }

  function completePayment() {
    setSubmitting(true);
    setTimeout(() => { setSubmitting(false); setPaid(true); setStep(4); onBooked && onBooked(); }, 1100);
  }

  const totalSteps = 3; // shown in progress: pax, details, offer/payment
  const progressIdx = step >= 4 ? totalSteps : Math.min(step, totalSteps - 1);

  const overlayStyle = {
    position: 'absolute', inset: 0, zIndex: 50,
    background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: isDialog ? 'center' : 'flex-end',
    justifyContent: 'center',
    opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
    transition: 'opacity 0.25s ease',
    padding: isDialog ? '32px' : 0,
  };
  const sheetStyle = isDialog ? {
    width: 480, maxWidth: '100%', background: BC.surface,
    borderRadius: 20,
    border: `1px solid ${BC.hairline}`,
    transform: open ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.97)',
    transition: 'transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)',
    maxHeight: '92%', overflow: 'auto',
    paddingBottom: 28,
    boxShadow: '0 40px 80px -20px rgba(0,0,0,0.6)',
  } : {
    width: '100%', background: BC.surface,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    border: `1px solid ${BC.hairline}`, borderBottom: 'none',
    transform: open ? 'translateY(0)' : 'translateY(100%)',
    transition: 'transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)',
    maxHeight: '88%', overflow: 'auto',
    paddingBottom: 28,
  };

  const titles = {
    0: 'How many in your party?',
    1: 'Just two details',
    2: 'Lock it in for ₹50/head',
    3: 'Pay early-bird cover',
    4: paid ? 'Booked & paid ✦' : 'You\'re on the list ✦',
  };
  const stepLabel = step === 4 ? 'Confirmed' : `Step ${Math.min(step+1, totalSteps)} of ${totalSteps}`;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={sheetStyle} onClick={e => e.stopPropagation()}>
        {!isDialog && (
          <div style={{display: 'flex', justifyContent: 'center', padding: '10px 0 4px'}}>
            <div style={{width: 38, height: 4, borderRadius: 999, background: 'rgba(246,239,230,0.18)'}}/>
          </div>
        )}

        <div style={{padding: isDialog ? '24px 28px 0' : '12px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div>
            <div style={{fontFamily: 'Geist Mono, monospace', fontSize: 9, color: BC.muted, letterSpacing: '0.15em', textTransform: 'uppercase'}}>
              {stepLabel}
            </div>
            <div style={{fontFamily: 'Fraunces, serif', fontSize: 22, color: BC.cream, marginTop: 2, lineHeight: 1.1, letterSpacing: '-0.02em'}}>
              {titles[step]}
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 999, border: `1px solid ${BC.hairline}`,
            background: 'rgba(255,255,255,0.04)', color: BC.cream, fontSize: 14, cursor: 'pointer',
          }}>×</button>
        </div>

        {step < 4 && (
          <div style={{display: 'flex', gap: 6, padding: '16px 24px 0'}}>
            {[0,1,2].map(i => (
              <div key={i} style={{flex: 1, height: 3, borderRadius: 999, background: progressIdx >= i ? BC.terra : 'rgba(246,239,230,0.12)'}}/>
            ))}
          </div>
        )}

        {/* step 0: pax */}
        {step === 0 && (
          <div style={{padding: '24px 24px 0'}}>
            {/* Early-bird banner */}
            <div style={{
              padding: '12px 14px', borderRadius: 10, marginBottom: 18,
              background: `linear-gradient(135deg, ${BC.terra}26, ${BC.terra}10)`,
              border: `1px solid ${BC.terra}55`,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: BC.terra, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              </div>
              <div>
                <div style={{fontFamily: 'Inter', fontSize: 12, fontWeight: 600, color: BC.cream}}>
                  Pay now, only ₹50/head
                </div>
                <div style={{fontSize: 11, color: BC.creamDim, marginTop: 1}}>
                  Skip the ₹1,500 cover · ends Sun 11:59 PM
                </div>
              </div>
            </div>

            <div style={{fontSize: 13, color: BC.creamDim, lineHeight: 1.5, marginBottom: 18, textWrap: 'pretty'}}>
              Pick your group size. We'll match you to the right table — couple, four-top, or large group.
            </div>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 22}}>
              {[2, 4, 6, 8].map(n => (
                <button
                  key={n}
                  onClick={() => setPax(n)}
                  style={{
                    aspectRatio: '1', borderRadius: 12, cursor: 'pointer',
                    background: pax === n ? BC.terra : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${pax === n ? BC.terra : BC.hairline}`,
                    color: BC.cream, fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 500,
                    transition: 'all 0.15s',
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4}}>
              <button
                onClick={() => setPax(Math.max(2, pax - 1))}
                style={{width: 38, height: 38, borderRadius: 999, border: `1px solid ${BC.hairline}`, background: 'rgba(255,255,255,0.04)', color: BC.cream, fontSize: 18, cursor: 'pointer'}}
              >−</button>
              <div style={{flex: 1, textAlign: 'center'}}>
                <div style={{fontFamily: 'Fraunces, serif', fontSize: 32, color: BC.cream, lineHeight: 1, fontVariantNumeric: 'tabular-nums'}}>{pax}</div>
                <div style={{fontFamily: 'Geist Mono, monospace', fontSize: 9, color: BC.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 4}}>guests</div>
              </div>
              <button
                onClick={() => setPax(Math.min(20, pax + 1))}
                style={{width: 38, height: 38, borderRadius: 999, border: `1px solid ${BC.hairline}`, background: 'rgba(255,255,255,0.04)', color: BC.cream, fontSize: 18, cursor: 'pointer'}}
              >+</button>
            </div>

            <button
              onClick={() => setStep(1)}
              style={{
                width: '100%', marginTop: 22, padding: '15px 18px', borderRadius: 12,
                background: BC.terra, color: BC.cream, border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: 600, fontFamily: 'Inter',
                boxShadow: `0 8px 20px -6px ${BC.terra}80`,
              }}
            >
              Continue →
            </button>
          </div>
        )}

        {/* step 1: details */}
        {step === 1 && (
          <div style={{padding: '24px 24px 0'}}>
            <div style={{fontSize: 13, color: BC.creamDim, marginBottom: 18, lineHeight: 1.5}}>
              We'll WhatsApp you the booking confirmation & GPS pin.
            </div>

            <div style={{marginBottom: 16}}>
              <label style={{fontFamily: 'Geist Mono, monospace', fontSize: 9, color: BC.muted, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: 6}}>Full name</label>
              <input value={name} onChange={e => { setName(e.target.value); if (errors.name) setErrors({...errors, name: null}); }} placeholder="Your name" style={{width: '100%', padding: '14px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: `1px solid ${errors.name ? '#e76a3d' : BC.hairline}`, color: BC.cream, fontSize: 15, fontFamily: 'Inter', outline: 'none'}}/>
              {errors.name && <div style={{color: '#e76a3d', fontSize: 11, marginTop: 6}}>{errors.name}</div>}
            </div>

            <div style={{marginBottom: 16}}>
              <label style={{fontFamily: 'Geist Mono, monospace', fontSize: 9, color: BC.muted, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: 6}}>WhatsApp number</label>
              <div style={{display: 'flex', gap: 8}}>
                <div style={{padding: '14px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: `1px solid ${BC.hairline}`, color: BC.creamDim, fontSize: 15, fontFamily: 'Inter', display: 'flex', alignItems: 'center'}}>+91</div>
                <input value={mobile} onChange={e => { setMobile(e.target.value.replace(/\D/g, '').slice(0, 10)); if (errors.mobile) setErrors({...errors, mobile: null}); }} placeholder="98765 43210" inputMode="numeric" style={{flex: 1, padding: '14px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: `1px solid ${errors.mobile ? '#e76a3d' : BC.hairline}`, color: BC.cream, fontSize: 15, fontFamily: 'Inter', outline: 'none', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.02em'}}/>
              </div>
              {errors.mobile && <div style={{color: '#e76a3d', fontSize: 11, marginTop: 6}}>{errors.mobile}</div>}
            </div>

            <div style={{display: 'flex', gap: 10}}>
              <button onClick={() => setStep(0)} style={{padding: '15px 18px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', color: BC.cream, border: `1px solid ${BC.hairline}`, cursor: 'pointer', fontSize: 14, fontWeight: 500, fontFamily: 'Inter'}}>← Back</button>
              <button onClick={gotoOffer} style={{flex: 1, padding: '15px 18px', borderRadius: 12, background: BC.terra, color: BC.cream, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'Inter', boxShadow: `0 8px 20px -6px ${BC.terra}80`}}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* step 2: pay or hold offer */}
        {step === 2 && (
          <div style={{padding: '24px 24px 0'}}>
            <div style={{fontSize: 13, color: BC.creamDim, marginBottom: 16, lineHeight: 1.5}}>
              Two ways to lock your table. The early-bird offer ends Sunday.
            </div>

            {/* recommended pay-now card */}
            <div style={{
              position: 'relative',
              padding: '18px 18px', borderRadius: 14, marginBottom: 12,
              background: `linear-gradient(135deg, ${BC.terra}28, ${BC.terra}10)`,
              border: `1.5px solid ${BC.terra}`,
            }}>
              <div style={{
                position: 'absolute', top: -10, right: 14, padding: '3px 8px',
                borderRadius: 999, background: BC.terra, color: '#fff',
                fontFamily: 'Geist Mono, monospace', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600,
              }}>Best deal</div>
              <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4}}>
                <div style={{fontFamily: 'Inter', fontSize: 13, fontWeight: 600, color: BC.cream}}>Early-bird booking</div>
                <div style={{fontFamily: 'Geist Mono, monospace', fontSize: 9, color: BC.terra, letterSpacing: '0.15em', textTransform: 'uppercase'}}>Save 96%</div>
              </div>
              <div style={{display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8}}>
                <div style={{fontFamily: 'Fraunces, serif', fontSize: 36, color: BC.cream, lineHeight: 1, fontWeight: 500}}>
                  ₹{(earlyBird * pax).toLocaleString('en-IN')}
                </div>
                <div style={{fontSize: 12, color: BC.muted, textDecoration: 'line-through'}}>
                  ₹{(fullCover * pax).toLocaleString('en-IN')}
                </div>
              </div>
              <div style={{fontSize: 12, color: BC.creamDim, marginBottom: 14, lineHeight: 1.5}}>
                ₹50 × {pax} guests · pay now via UPI / Card. Fully refundable up to 24 hrs before.
              </div>
              <ul style={{margin: 0, padding: 0, listStyle: 'none', fontSize: 12, color: BC.creamDim, lineHeight: 1.7}}>
                <li>✓ Table guaranteed instantly</li>
                <li>✓ Skip the ₹1,500 cover at the door</li>
                <li>✓ Welcome drink on the house</li>
              </ul>
              <button onClick={payNow} style={{
                width: '100%', marginTop: 16, padding: '14px 18px', borderRadius: 12,
                background: BC.terra, color: '#fff', border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: 600, fontFamily: 'Inter',
                boxShadow: `0 8px 20px -6px ${BC.terra}80`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                Pay ₹{(earlyBird * pax).toLocaleString('en-IN')} & confirm
              </button>
            </div>

            {/* hold-only option */}
            <button
              onClick={holdOnly}
              disabled={submitting}
              style={{
                width: '100%', padding: '14px 18px', borderRadius: 12,
                background: 'transparent', color: BC.creamDim, cursor: submitting ? 'wait' : 'pointer',
                border: `1px solid ${BC.hairline}`,
                fontSize: 13, fontFamily: 'Inter',
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting ? 'Holding...' : 'Just hold the table · pay ₹1,500/head at venue'}
            </button>

            <button onClick={() => setStep(1)} style={{
              width: '100%', marginTop: 10, padding: '10px', background: 'transparent',
              color: BC.muted, border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'Inter',
            }}>← Back</button>
          </div>
        )}

        {/* step 3: payment */}
        {step === 3 && (
          <div style={{padding: '24px 24px 0'}}>
            {/* gateway header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', borderRadius: 10,
              background: 'rgba(255,255,255,0.03)', border: `1px solid ${BC.hairline}`,
              marginBottom: 18,
            }}>
              <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={BC.terra} strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                <div style={{fontSize: 12, color: BC.creamDim}}>
                  Secured by <span style={{color: BC.cream, fontWeight: 600}}>Razorpay</span>
                </div>
              </div>
              <div style={{fontFamily: 'Geist Mono, monospace', fontSize: 9, color: BC.muted, letterSpacing: '0.15em', textTransform: 'uppercase'}}>SSL</div>
            </div>

            {/* method tabs */}
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 16}}>
              {[
                {id: 'upi', label: 'UPI'},
                {id: 'card', label: 'Card'},
                {id: 'netbank', label: 'Net Banking'},
              ].map(m => (
                <button key={m.id} onClick={() => setPayMethod(m.id)} style={{
                  padding: '10px 8px', borderRadius: 10, cursor: 'pointer',
                  background: payMethod === m.id ? BC.terra : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${payMethod === m.id ? BC.terra : BC.hairline}`,
                  color: BC.cream, fontSize: 12, fontWeight: 500, fontFamily: 'Inter',
                }}>{m.label}</button>
              ))}
            </div>

            {/* method body */}
            {payMethod === 'upi' && (
              <div>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14}}>
                  {['GPay', 'PhonePe', 'Paytm', 'BHIM'].map(app => (
                    <button key={app} style={{
                      padding: '10px 6px', borderRadius: 10,
                      background: 'rgba(255,255,255,0.04)', border: `1px solid ${BC.hairline}`,
                      color: BC.cream, fontSize: 11, fontFamily: 'Inter', cursor: 'pointer',
                    }}>{app}</button>
                  ))}
                </div>
                <div style={{fontFamily: 'Geist Mono, monospace', fontSize: 9, color: BC.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6}}>UPI ID</div>
                <input placeholder="yourname@upi" style={{
                  width: '100%', padding: '14px 14px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.04)', border: `1px solid ${BC.hairline}`,
                  color: BC.cream, fontSize: 14, fontFamily: 'Inter', outline: 'none',
                }}/>
              </div>
            )}
            {payMethod === 'card' && (
              <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
                <input placeholder="Card number · 1234 5678 9012 3456" style={{padding: '14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: `1px solid ${BC.hairline}`, color: BC.cream, fontSize: 14, fontFamily: 'Inter', outline: 'none', fontVariantNumeric: 'tabular-nums'}}/>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10}}>
                  <input placeholder="MM / YY" style={{padding: '14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: `1px solid ${BC.hairline}`, color: BC.cream, fontSize: 14, fontFamily: 'Inter', outline: 'none'}}/>
                  <input placeholder="CVV" style={{padding: '14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: `1px solid ${BC.hairline}`, color: BC.cream, fontSize: 14, fontFamily: 'Inter', outline: 'none'}}/>
                </div>
              </div>
            )}
            {payMethod === 'netbank' && (
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8}}>
                {['HDFC', 'ICICI', 'Axis', 'SBI', 'Kotak', 'Other'].map(b => (
                  <button key={b} style={{padding: '12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: `1px solid ${BC.hairline}`, color: BC.cream, fontSize: 13, fontFamily: 'Inter', cursor: 'pointer'}}>{b}</button>
                ))}
              </div>
            )}

            {/* summary */}
            <div style={{
              marginTop: 18, padding: '14px 16px', borderRadius: 10,
              background: 'rgba(255,255,255,0.03)', border: `1px solid ${BC.hairline}`,
              fontSize: 12, color: BC.creamDim, lineHeight: 1.7,
            }}>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <span>Early-bird cover (₹50 × {pax})</span>
                <span style={{color: BC.cream}}>₹{(earlyBird * pax).toLocaleString('en-IN')}</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', paddingTop: 8, marginTop: 8, borderTop: `1px solid ${BC.hairline}`, fontSize: 13}}>
                <span style={{color: BC.cream, fontWeight: 600}}>Total</span>
                <span style={{color: BC.cream, fontWeight: 600, fontFamily: 'Fraunces, serif', fontSize: 16}}>₹{(earlyBird * pax).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div style={{display: 'flex', gap: 10, marginTop: 18}}>
              <button onClick={() => setStep(2)} style={{padding: '15px 18px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', color: BC.cream, border: `1px solid ${BC.hairline}`, cursor: 'pointer', fontSize: 14, fontWeight: 500, fontFamily: 'Inter'}}>← Back</button>
              <button onClick={completePayment} disabled={submitting} style={{
                flex: 1, padding: '15px 18px', borderRadius: 12,
                background: BC.terra, color: '#fff', border: 'none',
                cursor: submitting ? 'wait' : 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'Inter',
                boxShadow: `0 8px 20px -6px ${BC.terra}80`, opacity: submitting ? 0.7 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                {submitting ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{animation: 'spin 1s linear infinite'}}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                    Processing...
                  </>
                ) : (
                  <>Pay ₹{(earlyBird * pax).toLocaleString('en-IN')}</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* step 4: success */}
        {step === 4 && (
          <div style={{padding: '24px 24px 0', textAlign: 'center'}}>
            <div style={{
              width: 72, height: 72, borderRadius: 999, margin: '8px auto 18px',
              background: `radial-gradient(circle, ${BC.terra} 0%, ${BC.terraDark} 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 12px 30px -8px ${BC.terra}80`,
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div style={{fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 15, color: BC.creamDim, marginBottom: 4}}>
              See you Saturday, {name.split(' ')[0] || 'friend'}
            </div>
            <div style={{
              padding: '16px 18px', borderRadius: 12, marginTop: 22,
              background: 'rgba(255,255,255,0.03)', border: `1px solid ${BC.hairline}`,
              textAlign: 'left',
            }}>
              <div style={{display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13}}>
                <span style={{color: BC.muted}}>Event</span>
                <span style={{color: BC.cream}}>Infusion Homecoming</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13}}>
                <span style={{color: BC.muted}}>Date</span>
                <span style={{color: BC.cream}}>Sat, 02 May · 9 PM</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13}}>
                <span style={{color: BC.muted}}>Party</span>
                <span style={{color: BC.cream}}>{pax} guests</span>
              </div>
              {paid && (
                <div style={{display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13}}>
                  <span style={{color: BC.muted}}>Paid</span>
                  <span style={{color: BC.terra, fontWeight: 600}}>₹{(earlyBird * pax).toLocaleString('en-IN')} · early bird</span>
                </div>
              )}
              <div style={{display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13}}>
                <span style={{color: BC.muted}}>{paid ? 'Receipt' : 'Confirmation'}</span>
                <span style={{color: BC.cream, fontFamily: 'Geist Mono, monospace', letterSpacing: '0.05em'}}>{paid ? 'RZP-' : 'AKN-'}{Math.floor(Math.random()*9000+1000)}</span>
              </div>
            </div>
            <div style={{fontSize: 12, color: BC.muted, marginTop: 18, lineHeight: 1.5}}>
              {paid
                ? `Receipt sent to +91 ${mobile.slice(0,5)} ${mobile.slice(5)} on WhatsApp.`
                : `We'll WhatsApp you on +91 ${mobile.slice(0,5)} ${mobile.slice(5)} within an hour to confirm your table.`}
            </div>
            <button onClick={onClose} style={{
              width: '100%', marginTop: 22, padding: '15px 18px', borderRadius: 12,
              background: BC.terra, color: '#fff', border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: 600, fontFamily: 'Inter',
              boxShadow: `0 8px 20px -6px ${BC.terra}80`,
            }}>
              Add to calendar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

window.BookingModal = BookingModal;
