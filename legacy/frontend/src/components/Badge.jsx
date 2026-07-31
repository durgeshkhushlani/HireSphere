const Badge = ({ variant = 'default', children }) => {
  const styles = {
    success: {
      background: 'var(--success-bg)',
      color: 'var(--success)',
      border: '1px solid rgba(52, 211, 153, 0.2)',
    },
    error: {
      background: 'var(--error-bg)',
      color: 'var(--error)',
      border: '1px solid rgba(248, 113, 113, 0.2)',
    },
    warning: {
      background: 'rgba(251, 191, 36, 0.1)',
      color: 'var(--warning)',
      border: '1px solid rgba(251, 191, 36, 0.2)',
    },
    default: {
      background: 'var(--accent-soft)',
      color: 'var(--accent)',
      border: '1px solid var(--accent-glow)',
    },
  };

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ fontFamily: 'var(--font-heading)', ...styles[variant] }}
    >
      {children}
    </span>
  );
};

export default Badge;
