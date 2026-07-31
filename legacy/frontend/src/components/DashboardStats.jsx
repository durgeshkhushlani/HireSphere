import { motion } from 'framer-motion';

const DashboardStats = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      {stats.map((stat, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.4 }}
          className="glass-card p-5 group cursor-default"
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
            >
              {stat.icon}
            </div>
            <span className="text-sub text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
              {stat.label}
            </span>
          </div>
          <div
            className="text-3xl font-bold"
            style={{
              fontFamily: 'var(--font-heading)',
              background: 'linear-gradient(135deg, var(--accent), #ec4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {stat.value}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default DashboardStats;
