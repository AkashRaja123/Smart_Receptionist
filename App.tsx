
import React, { useState, useEffect } from 'react';
import { DomainType, RoleType, UserSession, BuildingLayout } from './types';
import SelectionScreen from './components/SelectionScreen';
import LoginScreen from './components/LoginScreen';
import AdminDashboard from './components/AdminDashboard';
import UserDashboard from './components/UserDashboard';

const App: React.FC = () => {
  const [step, setStep] = useState<number>(1);
  const [session, setSession] = useState<UserSession | null>(null);
  const [layout, setLayout] = useState<BuildingLayout | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const loadLayout = () => {
      const savedLayout = localStorage.getItem('building_layout');
      if (savedLayout) setLayout(JSON.parse(savedLayout));
    };
    loadLayout();
    window.addEventListener('storage', loadLayout);
    return () => window.removeEventListener('storage', loadLayout);
  }, []);

  const handleDomainRoleSelect = (domain: DomainType, role: RoleType, institution: string) => {
    setSession({ domain, role, username: '', institutionName: institution });
    setStep(2);
  };

  const handleLogin = (username: string) => {
    if (session) {
      if (session.role !== RoleType.ADMIN) {
        const currentLayout = localStorage.getItem('building_layout');
        const parsed: BuildingLayout | null = currentLayout ? JSON.parse(currentLayout) : null;
        
        if (!parsed) {
          setAuthError("DATABASE ERROR: No institutional blueprint has been uploaded by the Administrator yet.");
          return;
        }

        const requested = session.institutionName.toLowerCase().trim();
        const actual = parsed.buildingName.toLowerCase().trim();
        
        if (requested !== actual && !actual.includes(requested)) {
          setAuthError(`INVALID INSTITUTION: No records found for "${session.institutionName}". The currently active navigation network is for "${parsed.buildingName}".`);
          return;
        }
      }
      
      setAuthError(null);
      setSession({ ...session, username });
      setStep(3);
    }
  };

  const handleUpdateLayout = (newLayout: BuildingLayout) => {
    setLayout(newLayout);
    localStorage.setItem('building_layout', JSON.stringify(newLayout));
    window.dispatchEvent(new Event('storage'));
  };

  const logout = () => {
    setSession(null);
    setStep(1);
    setAuthError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 py-3 px-6 flex justify-between items-center sticky top-0 z-[100] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/20">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tighter text-slate-900">
              SmartReceptionist
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Spatial Intelligence</p>
          </div>
        </div>
        {session && step === 3 && (
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
               <span className="text-xs font-black text-slate-800 uppercase tracking-tighter truncate max-w-[150px]">
                 {layout?.buildingName || session.institutionName}
               </span>
               <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                 {session.role} • {session.username}
               </span>
            </div>
            <button 
              onClick={logout} 
              className="px-4 py-2 text-xs font-black uppercase tracking-widest text-white bg-red-500 rounded-lg hover:bg-red-600 transition-all shadow-md shadow-red-500/20 active:scale-95"
            >
              Sign Out
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 w-full max-w-[1600px] mx-auto">
        {authError ? (
          <div className="max-w-md mx-auto mt-20 p-8 bg-white border border-red-100 rounded-3xl shadow-2xl text-center animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">⚠️</div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Access Restricted</h2>
            <p className="text-slate-500 mb-8 leading-relaxed font-medium">{authError}</p>
            <button 
              onClick={() => { setAuthError(null); setStep(1); setSession(null); }}
              className="w-full py-4 bg-slate-900 text-white font-black rounded-xl hover:bg-slate-800 transition-all shadow-xl active:scale-95"
            >
              Back to Selection
            </button>
          </div>
        ) : (
          <div className="py-6 h-full">
            {step === 1 && <SelectionScreen onComplete={handleDomainRoleSelect} />}
            {step === 2 && session && <LoginScreen domain={session.domain} role={session.role} onLogin={handleLogin} onBack={() => setStep(1)} />}
            {step === 3 && session && (
              session.role === RoleType.ADMIN ? (
                <AdminDashboard session={session} layout={layout} onLayoutUpdate={handleUpdateLayout} />
              ) : (
                <UserDashboard session={session} layout={layout} />
              )
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
