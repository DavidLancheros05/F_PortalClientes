"use client";

import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '@/context/AuthContext';
import styles from './page.module.css';

export default function InicioPage() {
  const { user, loading } = useContext(AuthContext);
  const [usuario_nombre, setUserName] = useState<string>('');

  useEffect(() => {
    // Log para debug
    // console.log('User:', user);
    // console.log('Loading:', loading);

    if (user?.usuario_nombre) {
      setUserName(user.usuario_nombre);
    } else if (typeof window !== 'undefined') {
      // Intenta obtener del localStorage si AuthContext aún no cargó
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUserName(parsedUser.usuario_nombre || 'Bienvenido');
      }
    }
  }, [user]);

  return (
    <section className={styles.hero}>
      <div className={`${styles.cajasSvg} ${styles.pos1}`}>
        <svg viewBox="0 0 100 120">
          <path className={styles.lineaOro} d="M25 45 L50 56 L75 45 L50 34 Z" />
          <path className={styles.lineaOro} d="M25 45 L25 75 L50 86 L75 75 L75 45" />
          <path className={styles.lineaOro} d="M50 86 L50 56" />
          <path className={styles.lineaOro} d="M25 45 L15 30 L40 19 L50 34" />
          <path className={styles.lineaOro} d="M75 45 L85 30 L60 19 L50 34" />
          <path className={styles.lineaOro} d="M25 45 L15 55 L40 66 L50 56" />
          <path className={styles.lineaOro} d="M75 45 L85 55 L60 66 L50 56" />
        </svg>
      </div>

      <div className={`${styles.cajasSvg} ${styles.pos2}`}>
        <svg viewBox="0 0 100 120">
          <path className={styles.lineaOro} d="M25 45 L50 56 L75 45 L50 34 Z" />
          <path className={styles.lineaOro} d="M25 45 L25 75 L50 86 L75 75 L75 45" />
          <path className={styles.lineaOro} d="M50 86 L50 56" />
          <path className={styles.lineaOro} d="M25 45 L15 30 L40 19 L50 34" />
          <path className={styles.lineaOro} d="M75 45 L85 30 L60 19 L50 34" />
          <path className={styles.lineaOro} d="M25 45 L15 55 L40 66 L50 56" />
          <path className={styles.lineaOro} d="M75 45 L85 55 L60 66 L50 56" />
        </svg>
      </div>

      <div className={styles.content}>
        <div className={styles.logoBox}>CN</div>
        <div className={styles.subEmpresa}>Cartonera Nacional S.A.</div>
        <p className={styles.bienvenida}>Bienvenido</p>
        <h1 className={styles.nombrePersonal}>{usuario_nombre || 'Usuario'}</h1>
        <div className={styles.divider}></div>
        <p className={styles.tagline}>EL ARTE DEL EMPAQUE PERFECTO</p>
      </div>
    </section>
  );
}


