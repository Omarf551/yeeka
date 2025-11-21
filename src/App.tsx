import { useState, useEffect } from 'react';
import { Login } from './components/Login';
import { AdminDashboard } from './components/AdminDashboard';
import { WaiterDashboard } from './components/WaiterDashboard';
import { CookDashboard } from './components/CookDashboard';
import { CashierDashboard } from './components/CashierDashboard';
import { Button } from './components/ui/button';
import { Toaster } from './components/ui/sonner';
import { LogOut } from 'lucide-react';
import { initializeData } from './utils/initializeData';

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Initialize demo data on first load
  useEffect(() => {
    initializeData();
  }, []);

  // Check for saved session
  useEffect(() => {
    const savedUser = localStorage.getItem('restaurante_user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (user: any) => {
    setCurrentUser(user);
    localStorage.setItem('restaurante_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('restaurante_user');
  };

  if (!currentUser) {
    return (
      <>
        <Login onLogin={handleLogin} />
        <Toaster />
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-gray-900">Sistema de Restaurante</h1>
              <p className="text-gray-600">
                {currentUser.nombre} - {currentUser.rol.charAt(0).toUpperCase() + currentUser.rol.slice(1)}
              </p>
            </div>
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="size-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {currentUser.rol === 'administrador' && <AdminDashboard user={currentUser} />}
          {currentUser.rol === 'mesero' && <WaiterDashboard user={currentUser} />}
          {currentUser.rol === 'cocinero' && <CookDashboard user={currentUser} />}
          {currentUser.rol === 'cajero' && <CashierDashboard user={currentUser} />}
        </main>
      </div>
      <Toaster />
    </>
  );
}