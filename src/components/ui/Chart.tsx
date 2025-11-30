'use client'
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip,
    Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export function Chart({ data}: {data: { created_at: string; metric_value: number }[] }) {
    const chartData = {
        labels: data.map((d) => d.created_at),
        datasets: [
            {
                label: 'Performance Over Time',
                data: data.map((d) => d.metric_value),
                borderColor: 'rgba(75, 192,192)',
                tension: 0.1,
            },
        ],
    };
    return <Line data={chartData} />;
} 