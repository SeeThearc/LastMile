import { useState, useEffect } from 'react';
import { Truck, CheckCircle2, AlertTriangle, Navigation } from 'lucide-react';

export default function AgentDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [failureNote, setFailureNote] = useState('');
  const [failingId, setFailingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const fetchAssignedOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/agents/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setOrders(data.orders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedOrders();
  }, []);

  const updateStatus = async (orderId: string, status: string, note?: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/agents/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, note })
      });
      if (res.ok) {
        setFailingId(null);
        setFailureNote('');
        fetchAssignedOrders();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update status');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getNextStatus = (current: string) => {
    switch (current) {
      case 'ASSIGNED': return { next: 'PICKED_UP', label: 'Mark as Picked Up' };
      case 'PICKED_UP': return { next: 'IN_TRANSIT', label: 'Start Transit' };
      case 'IN_TRANSIT': return { next: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' };
      case 'OUT_FOR_DELIVERY': return { next: 'DELIVERED', label: 'Complete Delivery' };
      default: return null;
    }
  };

  const displayedOrders = activeTab === 'active' 
    ? orders.filter(o => !['DELIVERED', 'FAILED', 'RESCHEDULED'].includes(o.status))
    : orders.filter(o => ['DELIVERED', 'FAILED', 'RESCHEDULED'].includes(o.status));

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 pb-24">
      <div className="bg-slate-900 text-white p-6 rounded-b-3xl shadow-lg mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold flex items-center">
            <Truck className="w-6 h-6 mr-3 text-brand-400" />
            Driver App
          </h1>
          <button 
            onClick={() => {
              localStorage.clear();
              window.location.href = '/login';
            }}
            className="text-xs font-bold text-red-400 bg-white/10 px-3 py-1.5 rounded-full hover:bg-white/20 transition-colors"
          >
            Logout
          </button>
        </div>
        
        <div className="flex bg-slate-800 rounded-full p-1 mt-6">
          <button 
            onClick={() => setActiveTab('active')}
            className={`flex-1 py-2 text-sm font-bold rounded-full transition-colors ${activeTab === 'active' ? 'bg-brand-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            Active
          </button>
          <button 
            onClick={() => setActiveTab('past')}
            className={`flex-1 py-2 text-sm font-bold rounded-full transition-colors ${activeTab === 'past' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            History
          </button>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {loading ? (
          <div className="text-center text-slate-500 py-8">Loading tasks...</div>
        ) : displayedOrders.length === 0 ? (
          <div className="glass p-8 rounded-3xl text-center text-slate-500 border border-slate-200">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>{activeTab === 'active' ? 'You have no active orders assigned.' : 'No past deliveries.'}</p>
          </div>
        ) : (
          displayedOrders.map(order => {
            const nextAction = getNextStatus(order.status);
            const isFailing = failingId === order.id;
            const isExpanded = expandedOrderId === order.id;

            return (
              <div key={order.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div 
                  onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                  className="p-5 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="px-3 py-1 bg-brand-100 text-brand-700 font-bold text-xs rounded-full">
                      {order.status}
                    </span>
                    <span className="text-xs font-mono text-slate-400">ID: {order.id}</span>
                  </div>

                  <div className="space-y-3 relative before:absolute before:inset-y-3 before:left-2.5 before:w-0.5 before:bg-slate-200">
                    <div className="flex items-start gap-3 relative z-10">
                      <div className="w-5 h-5 bg-white border-4 border-slate-800 rounded-full flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-semibold text-slate-500 uppercase">Pickup</div>
                        <div className="text-sm font-medium text-slate-900">{order.pickupAddress}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 relative z-10">
                      <div className="w-5 h-5 bg-white border-4 border-brand-500 rounded-full flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-semibold text-slate-500 uppercase">Drop</div>
                        <div className="text-sm font-medium text-slate-900">{order.dropAddress}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 grid grid-cols-2 gap-4 text-sm animate-in slide-in-from-top-2">
                    <div>
                      <span className="block text-xs font-semibold text-slate-500 uppercase">Weight</span>
                      <span className="font-medium text-slate-900">{order.actualWeight} kg</span>
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-slate-500 uppercase">Payment</span>
                      <span className="font-medium text-slate-900">{order.paymentType}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-slate-500 uppercase">Charge</span>
                      <span className="font-medium text-slate-900">₹{order.totalCharge}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-slate-500 uppercase">Dimensions</span>
                      <span className="font-medium text-slate-900">{order.length}x{order.breadth}x{order.height}</span>
                    </div>
                  </div>
                )}

                {activeTab === 'active' && (
                  <div className="p-4 bg-white space-y-3">
                  {nextAction && !isFailing && (
                    <>
                      <button 
                        onClick={() => updateStatus(order.id, nextAction.next)}
                        className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-md flex justify-center items-center gap-2 active:scale-95 transition-all"
                      >
                        <Navigation className="w-4 h-4" />
                        {nextAction.label}
                      </button>
                      <button 
                        onClick={() => setFailingId(order.id)}
                        className="w-full py-3 bg-white text-red-500 font-bold rounded-xl border border-red-100 flex justify-center items-center gap-2 active:scale-95 transition-all"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        Report Issue
                      </button>
                    </>
                  )}

                  {isFailing && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                      <textarea
                        value={failureNote}
                        onChange={(e) => setFailureNote(e.target.value)}
                        placeholder="Explain why delivery failed..."
                        className="w-full p-3 rounded-xl border border-red-200 text-sm focus:ring-2 focus:ring-red-500/50 outline-none mb-3"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setFailingId(null)}
                          className="flex-1 py-2.5 bg-slate-200 text-slate-700 font-bold rounded-xl"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => updateStatus(order.id, 'FAILED', failureNote)}
                          disabled={!failureNote.trim()}
                          className="flex-1 py-2.5 bg-red-500 text-white font-bold rounded-xl disabled:opacity-50"
                        >
                          Confirm Fail
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
