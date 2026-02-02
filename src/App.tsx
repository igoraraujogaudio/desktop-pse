import { useState, useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { supabase } from "./lib/supabase";
import AlmoxarifeView from "./pages/AlmoxarifeView";
import EmployeeView from "./pages/EmployeeView";
import Login from "./pages/Login";
import SdkStatusCheck from "./components/SdkStatusCheck";
import { BiometricStatusIndicator } from "./components/BiometricStatusIndicator";

const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes

function App() {
  const [windowLabel, setWindowLabel] = useState<string>("");
  const [sdkReady, setSdkReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastResetTimestampRef = useRef<number>(0);

  useEffect(() => {
    checkWindowAndAuth();
  }, []);

  // Setup inactivity timer
  useEffect(() => {
    if (!isAuthenticated) return;

    // Throttle the timer reset to avoid performance issues on high-frequency events
    // const lastResetTimestampref = useRef<number>(0); // This line is moved

    const resetTimer = () => {
      const now = Date.now();
      // Only reset if more than 1 second has passed since last reset
      if (now - lastResetTimestampRef.current > 1000) {
        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current);
        }

        inactivityTimerRef.current = setTimeout(() => {
          console.log('⏰ Session timeout due to inactivity');
          handleLogout();
        }, INACTIVITY_TIMEOUT);

        lastResetTimestampRef.current = now;
      }
    };

    // Add 'mousemove' and 'wheel' to detect active usage more accurately
    // Use { capture: true } to detect events even if they don't bubble (like scroll in modals)
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click', 'wheel'];

    events.forEach(event => {
      document.addEventListener(event, resetTimer, { capture: true, passive: true });
    });

    // Initial reset
    resetTimer();

    // Listen for activity from other windows (e.g. employee view)
    const unlistenPromise = listen('activity-detected', resetTimer);

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      events.forEach(event => {
        document.removeEventListener(event, resetTimer, { capture: true } as any);
      });
      unlistenPromise.then(unlisten => unlisten());
    };
  }, [isAuthenticated]);

  const checkWindowAndAuth = async () => {
    try {
      const current = getCurrentWindow();
      const label = current.label;
      setWindowLabel(label);

      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setIsAuthenticated(!!session);
      });

      return () => subscription.unsubscribe();
    } catch (err) {
      console.error("Erro na inicialização:", err);
      setIsAuthenticated(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      setSdkReady(false); // Reset SDK status on logout
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (isAuthenticated === null) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-100">Carregando sistema...</div>;
  }

  if (windowLabel === "employee") {
    return <EmployeeView />;
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  if (!sdkReady) {
    return <SdkStatusCheck onReady={() => setSdkReady(true)} />;
  }

  return (
    <>
      <AlmoxarifeView onLogout={handleLogout} />
      {/* Indicador de status do leitor biométrico */}
      <BiometricStatusIndicator />
    </>
  );
}

export default App;
