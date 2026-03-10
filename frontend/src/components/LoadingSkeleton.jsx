const LoadingSkeleton = ({ type = 'cards', count = 3 }) => {
  if (type === 'cards') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="glass-card p-6">
            <div className="skeleton w-12 h-12 rounded-2xl mb-4"></div>
            <div className="skeleton w-3/4 h-5 mb-3"></div>
            <div className="skeleton w-1/2 h-4 mb-4"></div>
            <div className="skeleton w-full h-3 mb-2"></div>
            <div className="skeleton w-2/3 h-3 mb-4"></div>
            <div className="skeleton w-1/3 h-4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'page') {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="skeleton w-1/3 h-8 mb-4"></div>
        <div className="skeleton w-2/3 h-4 mb-8"></div>
        <div className="skeleton w-full h-40 mb-4"></div>
        <div className="skeleton w-full h-32"></div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 border-3 rounded-full animate-spin"
        style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--accent)' }}
      />
    </div>
  );
};

export default LoadingSkeleton;
