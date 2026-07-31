import { motion } from 'framer-motion';
import { Calendar, HelpCircle, ArrowRight } from 'lucide-react';
import Badge from './Badge';

const CompanyCard = ({ company, hasApplied, isExpired, onAction, actionLabel }) => {
  const formattedDeadline = company.lastDate
    ? new Date(company.lastDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="glass-card p-6 relative cursor-pointer group"
      onClick={onAction}
    >
      {/* Status Badge */}
      {hasApplied && (
        <div className="absolute top-4 right-4">
          <Badge variant="success">Applied ✓</Badge>
        </div>
      )}
      {isExpired && !hasApplied && (
        <div className="absolute top-4 right-4">
          <Badge variant="error">Closed</Badge>
        </div>
      )}

      {/* Company Icon */}
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold mb-4"
        style={{
          background: 'linear-gradient(135deg, var(--accent), #ec4899)',
          color: 'white',
          fontFamily: 'var(--font-heading)',
        }}
      >
        {company.name.charAt(0)}
      </div>

      {/* Content */}
      <h3
        className="text-lg font-bold mb-1 group-hover:opacity-90 transition-opacity"
        style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}
      >
        {company.name}
      </h3>
      <p className="text-sm font-semibold mb-3" style={{ color: 'var(--accent)' }}>
        {company.role}
      </p>
      <p className="text-sm mb-4 line-clamp-2" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        {company.description}
      </p>

      {/* Meta */}
      <div className="flex items-center gap-4 mb-4 text-xs" style={{ color: 'var(--text-muted)' }}>
        {formattedDeadline && (
          <div className="flex items-center gap-1">
            <Calendar size={12} />
            <span className={isExpired ? 'line-through' : ''} style={isExpired ? { color: 'var(--error)' } : {}}>
              {formattedDeadline}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <HelpCircle size={12} />
          <span>{company.formQuestions?.length || 0} questions</span>
        </div>
      </div>

      {/* CTA */}
      <div
        className="flex items-center gap-1 text-sm font-semibold group-hover:gap-2 transition-all duration-300"
        style={{ color: 'var(--accent)', fontFamily: 'var(--font-heading)' }}
      >
        {actionLabel || 'View Details'}
        <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
      </div>
    </motion.div>
  );
};

export default CompanyCard;
