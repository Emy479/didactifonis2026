import { createContext, useContext, useState, useEffect } from 'react';

const ChildContext = createContext(null);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function ChildProvider({ children }) {
  const [childrenList, setChildrenList] = useState([]);
  const [activeChild, setActiveChild] = useState(null);
  const [childMode, setChildMode] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadChildren = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const res = await fetch(`${API_URL}/api/children`, {
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) throw new Error('Error al cargar niños');
      const data = await res.json();
      setChildrenList(data);
    } catch (error) {
      console.error('Error cargando niños:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChildren();
  }, []);

  const enterChildMode = (child) => {
    setActiveChild(child);
    setChildMode(true);
  };

  const exitChildMode = () => {
    setChildMode(false);
  };

  return (
    <ChildContext.Provider
      value={{
        children: childrenList,
        activeChild,
        childMode,
        loading,
        setActiveChild,
        enterChildMode,
        exitChildMode,
        loadChildren,
      }}
    >
      {children}
    </ChildContext.Provider>
  );
}

export function useChild() {
  const context = useContext(ChildContext);
  if (!context) {
    throw new Error('useChild debe usarse dentro de ChildProvider');
  }
  return context;
}
