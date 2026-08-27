// components/TelaCarregando.jsx
// Tela cheia usada enquanto ainda checamos se existe uma sessão válida
// (antes de decidir se mostra a landing, o login ou a área logada).

import { motion } from 'framer-motion';

export default function TelaCarregando({ className = '' }) {
  return (
    <div className={`tela-carregando ${className}`.trim()}>
      <motion.div
        className="spinner"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
      />
      <span className="carregando-texto">Carregando…</span>
    </div>
  );
}