// components/DatasetOverview.jsx
export default function DatasetOverview({ summary }) {
    const formatDateRange = () => {
        if (!summary?.date_min || !summary?.date_max) return '—';

        const minDate = new Date(summary.date_min);
        const maxDate = new Date(summary.date_max);

        const formatDate = (date) => {
            const month = date.toLocaleDateString('en', { month: 'short' });
            const year = date.getFullYear();
            return `${month} ${year}`;
        };

        return `${formatDate(minDate)} - ${formatDate(maxDate)}`;
    };

    const datasetStats = [
        {
            value: summary?.rows || '—',
            label: 'Total Records'
        },
        {
            value: summary?.players?.length || '—',
            label: 'Active Players'
        },
        {
            value: formatDateRange(),
            label: 'Date Range',
            isDateRange: true
        }
    ];

    return (
        <div className="grid grid-cols-3">
            {datasetStats.map((stat, index) => (
                <div key={index} className="stat-card" style={{
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '120px'
                }}>
                    <div className="stat-value" style={{
                        fontSize: stat.isDateRange ? 'var(--text-xl)' : 'var(--text-3xl)'
                    }}>
                        {stat.value}
                    </div>
                    <div className="stat-label">{stat.label}</div>
                </div>
            ))}
        </div>
    );
}