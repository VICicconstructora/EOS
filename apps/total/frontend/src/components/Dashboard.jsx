import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import {
    ArrowUpRight, ArrowDownRight, Activity, Users,
    Database, FileText, Download, Filter, RefreshCw
} from 'lucide-react';

// Mock data until SharePoint connection is verified
const MOCK_DATA = {
    kpis: [
        { label: 'Total Sales', value: '$1.2M', change: '+12.5%', icon: Activity, trend: 'up' },
        { label: 'Active Projects', value: '42', change: '+3', icon: Database, trend: 'up' },
        { label: 'Report Completion', value: '94%', change: '-2.1%', icon: FileText, trend: 'down' },
    ],
    chartData: [
        { name: 'Jan', value: 400 }, { name: 'Feb', value: 300 },
        { name: 'Mar', value: 600 }, { name: 'Apr', value: 800 },
        { name: 'May', value: 500 }, { name: 'Jun', value: 900 },
    ],
    distribution: [
        { name: 'GeneralIC', value: 400 },
        { name: 'GND', value: 300 },
    ]
};

const COLORS = ['#3b82f6', '#818cf8', '#6366f1', '#4f46e5'];

const Dashboard = () => {
    const [data, setData] = useState(null); // Changed from MOCK_DATA to null
    const [loading, setLoading] = useState(true); // Changed from false to true
    const [error, setError] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Try to fetch from both site data files
            const [res1, res2] = await Promise.all([
                fetch('/data_generalic.json').then(r => r.ok ? r.json() : null),
                fetch('/data_gnd.json').then(r => r.ok ? r.json() : null)
            ]);

            if (!res1 && !res2) {
                throw new Error("No data found. Please run the SharePoint fetcher script first.");
            }

            // Combine and process data (simplistic for now)
            const combinedData = [...(res1 || []), ...(res2 || [])];

            // Update charts based on real data if columns exist
            // This part would be more complex depending on the Excel structure
            if (combinedData.length > 0) {
                // Example: If there's a 'Date' and 'Value' column
                // For now, we'll fall back to MOCK_DATA if real data isn't processed into the expected format
                setData(MOCK_DATA); // Fallback to MOCK_DATA for structure
            } else {
                setData(MOCK_DATA); // Fallback if combinedData is empty
            }

            setLoading(false);
        } catch (err) {
            console.error(err);
            setError(err.message);
            setLoading(false);
            setData(MOCK_DATA); // Fallback to MOCK_DATA on error
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
    );

    // If data is still null after loading (e.g., fetchData failed and didn't set MOCK_DATA)
    if (!data) return (
        <div className="flex items-center justify-center min-h-[400px] text-red-400">
            Error: Could not load dashboard data.
        </div>
    );

    return (
        <div className="dashboard-container">
            {/* Header Info */}
            <div className="dashboard-header">
                <div>
                    <h2 className="section-title">Overview</h2>
                    <p className="section-subtitle">Real-time data from SharePoint Sites</p>
                </div>
                <div className="header-actions">
                    {error && <span className="text-red-400 text-xs mr-4">{error}</span>}
                    <button onClick={fetchData} className="refresh-btn">
                        <RefreshCw className={loading ? 'animate-spin' : ''} size={16} />
                        {loading ? 'Refreshing...' : 'Sync Dashboard'}
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="kpi-grid">
                {data.kpis.map((kpi, i) => (
                    <div key={i} className="kpi-card glass card-hover">
                        <div className="kpi-icon-wrapper">
                            <kpi.icon size={20} className="text-primary" />
                        </div>
                        <div className="kpi-info">
                            <span className="kpi-label">{kpi.label}</span>
                            <div className="kpi-value-row">
                                <span className="kpi-value">{kpi.value}</span>
                                <span className={`kpi-change ${kpi.trend}`}>
                                    {kpi.change}
                                    {kpi.trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="charts-grid">
                <div className="chart-wrapper glass">
                    <h3 className="chart-title">Growth Trend</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={data.chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#ffffff40', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#ffffff40', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#121216', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="chart-wrapper glass">
                    <h3 className="chart-title">Workload Distribution</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={data.distribution}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {data.distribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#121216', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
