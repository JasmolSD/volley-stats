// components/TeamStatistics.jsx

export default function TeamStatistics({ summary }) {
    const formatPercentage = (value) => {
        if (value === null || value === undefined || isNaN(value)) return '—';
        return `${Math.round(value * 100)}%`;
    };

    const formatDecimal = (value, decimals = 1) => {
        if (value === null || value === undefined || isNaN(value)) return '—';
        return Number(value).toFixed(decimals);
    };

    const performanceStats = [
        {
            value: formatDecimal(summary?.avg_errors_per_set),
            label: 'Avg Errors per Set'
        },
        {
            value: formatPercentage(summary?.atk_accuracy),
            label: 'Avg Hitting Rate'
        },
        {
            value: formatPercentage(summary?.rcv_accuracy),
            label: 'Avg Receiving Accuracy'
        },
        {
            value: formatPercentage(summary?.srv_accuracy),
            label: 'Avg Serving Accuracy'
        }
    ];

    return (
        <div className="grid grid-cols-4">
            {performanceStats.map((stat, index) => (
                <div key={index} className="stat-card" style={{
                    background: 'rgba(255, 255, 255, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '120px',
                    transition: 'all 0.2s ease',
                    cursor: 'default'
                }}
                    onMouseEnter={(e) => {
                        const card = e.currentTarget;
                        card.style.borderColor = 'rgba(6, 201, 255, 0.8)';
                        card.style.boxShadow = '0 0 0 2px rgba(6, 201, 255, 0.6) inset, 0 4px 12px rgba(0, 0, 0, 0.15), 0 0 20px rgba(6, 201, 255, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                        const card = e.currentTarget;
                        card.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                        card.style.boxShadow = '0 0 0 1px rgba(255, 255, 255, 0.2) inset, 0 4px 12px rgba(0, 0, 0, 0.15)';
                    }}
                >
                    <div className="stat-value" style={{
                        fontSize: 'var(--text-2xl)',
                        color: '#1f2937',
                        fontWeight: '700',
                        pointerEvents: 'none'
                    }}>
                        {stat.value}
                    </div>
                    <div className="stat-label" style={{
                        color: '#6b7280',
                        fontWeight: '500',
                        pointerEvents: 'none'
                    }}>
                        {stat.label}
                    </div>
                </div>
            ))}
        </div>
    );
}