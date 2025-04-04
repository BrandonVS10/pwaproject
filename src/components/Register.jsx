import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const navigate = useNavigate();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const insertIndexedDB = (data) => {
    const dbRequest = window.indexedDB.open("database", 2);

    dbRequest.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("Usuarios")) {
        db.createObjectStore("Usuarios", { keyPath: "id", autoIncrement: true });
      }
    };

    dbRequest.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction("Usuarios", "readwrite");
      const store = transaction.objectStore("Usuarios");

      const addRequest = store.add(data);
      addRequest.onsuccess = () => {
        console.log("✅ Usuario guardado en IndexedDB:", addRequest.result);
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
          navigator.serviceWorker.ready
            .then(reg => reg.sync.register("syncUsuarios"))
            .catch(err => console.error("❌ Error al registrar sync:", err));
        }
      };

      addRequest.onerror = () => console.error("❌ Error al insertar en IndexedDB");
    };

    dbRequest.onerror = () => console.error("❌ Error al abrir IndexedDB");
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    const userData = { nombre, email, password };

    if (!isOnline) {
      setError('⚠️ Sin conexión. Datos guardados localmente.');
      insertIndexedDB(userData);
      return;
    }

    try {
      const response = await fetch('https://servidorpwa.onrender.com/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Registro exitoso. Ahora puedes iniciar sesión.');
        navigate('/login');
      } else {
        setError(data.message || 'Error al registrarte.');
      }
    } catch (err) {
      setError('No se pudo conectar al servidor. Intenta de nuevo.');
    }
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleRegister} style={styles.form}>
        <h2 style={styles.heading}>Registro</h2>
        {error && <div style={styles.error}>{error}</div>}
        <input
          type="text"
          placeholder="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          style={styles.input}
          required
        />
        <input
          type="email"
          placeholder="Correo Electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
          required
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
          required
        />
        <button type="submit" style={styles.button}>Registrar</button>
      </form>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    height: '100vh', backgroundColor: '#e7e7e7', padding: '0 20px',
  },
  form: {
    backgroundColor: '#fff', padding: '40px', borderRadius: '10px',
    boxShadow: '0 10px 20px rgba(0, 0, 0, 0.1)', maxWidth: '400px',
    textAlign: 'center',
  },
  heading: {
    fontSize: '2.2rem', color: '#2D87F0', marginBottom: '25px', fontWeight: '500',
  },
  input: {
    width: '100%', padding: '12px', marginBottom: '20px', border: '1px solid #ddd',
    borderRadius: '8px', fontSize: '1rem', outline: 'none',
  },
  button: {
    width: '100%', padding: '14px', backgroundColor: '#2D87F0',
    color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1.2rem',
    cursor: 'pointer',
  },
  error: {
    color: '#f44336', marginBottom: '10px', fontSize: '1rem', fontWeight: '500',
  },
};

export default Register;

