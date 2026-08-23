import { useState, useEffect } from 'react';
import { History as HistoryIcon, Package } from 'lucide-react';

export default function History() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL}/orders`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setOrders(data.orders.filter((o: any) => ['DELIVERED', 'FAILED', 'RESCHEDULED'].includes(o.status)));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center mb-8">
        <HistoryIcon className="w-8 h-8 mr-3 text-slate-800" />
        <h1 className="text-3xl font-bold text-slate-900">Order History</h1>
      </div>

      <div className="glass-panel p-6 rounded-3xl">
        {loading ? (
          <div className="text-center text-slate-500 py-12">Loading history...</div>
        ) : orders.length === 0 ? (
          <div className="text-center text-slate-500 py-12 flex flex-col items-center">
            <Package className="w-12 h-12 mb-4 text-slate-300" />
            <p>You have no past deliveries.</p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="w-full text-left">
              <thead className="text-xs text-slate-500 uppercase border-b border-slate-100">
                <tr>
                  <th className="pb-3 font-semibold">Order ID</th>
                  <th className="pb-3 font-semibold">Drop</th>
                  <th className="pb-3 font-semibold">Total Charge</th>
                  <th className="pb-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 font-mono text-xs text-slate-600">{order.id}</td>
                    <td className="py-4 font-medium text-slate-800">{order.dropAddress}</td>
                    <td className="py-4 font-bold text-slate-900">₹{order.totalCharge}</td>
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                        order.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
