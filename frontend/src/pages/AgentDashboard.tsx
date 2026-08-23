import { useState, useEffect } from 'react';
import { Truck, CheckCircle2, Navigation } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Button from '../components/Button';

export default function AgentDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [failureNote, setFailureNote] = useState('');
  const [failingId, setFailingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchAssignedOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/agents/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedOrders();
  }, []);

  const updateStatus = async (orderId: string, status: string, note?: string) => {
    setUpdatingId(orderId);
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
        toast.success(`Order marked as ${status}`);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update status');
      }
    } catch (error) {
      toast.error('Network error');
    } finally {
      setUpdatingId(null);
    }
  };

  const getNextStatus = (current: string) => {
    if (current === 'ASSIGNED') return { label: 'Mark Picked Up', next: 'PICKED_UP' };
    if (current === 'PICKED_UP') return { label: 'Start Delivery', next: 'IN_TRANSIT' };
    if (current === 'IN_TRANSIT') return { label: 'Mark Delivered', next: 'DELIVERED' };
    return null;
  };

  const displayedOrders = orders.filter(o => 
    activeTab === 'active' 
      ? ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'].includes(o.status)
      : ['DELIVERED', 'FAILED'].includes(o.status)
  );

  return (
    <div className="max-w-2xl mx-auto h-full flex flex-col">
      <div className="flex items-center space-x-3 mb-6 animate-fade-in-up">
        <div className="p-3 bg-brand-500 rounded-2xl shadow-lg shadow-brand-500/20">
          <Truck className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Deliveries</h1>
          <p className="text-sm text-slate-500 font-medium">Manage your assigned tasks</p>
        </div>
      </div>

      <div className="flex bg-slate-200/50 p-1 rounded-full mb-6 animate-fade-in-up">
        <button 
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-2 text-sm font-bold rounded-full transition-all duration-300 ${activeTab === 'active' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500'}`}
        >
          Active Tasks
        </button>
        <button 
          onClick={() => setActiveTab('past')}
          className={`flex-1 py-2 text-sm font-bold rounded-full transition-all duration-300 ${activeTab === 'past' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
        >
          Past Deliveries
        </button>
      </div>

      <div className="flex-1 space-y-4">
        {loading ? (
          <div className="text-center text-slate-500 py-8 animate-fade-in-up">Loading tasks...</div>
        ) : displayedOrders.length === 0 ? (
          <div className="glass p-8 rounded-3xl text-center text-slate-500 border border-slate-200 animate-fade-in-up">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>{activeTab === 'active' ? 'You have no active orders assigned.' : 'No past deliveries.'}</p>
          </div>
        ) : (
          displayedOrders.map((order, index) => {
            const nextAction = getNextStatus(order.status);
            const isFailing = failingId === order.id;
            const isExpanded = expandedOrderId === order.id;

            return (
              <div key={order.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in-up transition-all duration-300 hover:shadow-md hover:-translate-y-0.5" style={{ animationDelay: `${index * 50}ms` }}>
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
                      <div className="w-5 h-5 rounded-full bg-slate-100 border-2 border-white flex-shrink-0 mt-0.5 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-slate-300" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase">Pickup</p>
                        <p className="text-sm font-semibold text-slate-800">{order.pickupAddress}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 relative z-10">
                      <div className="w-5 h-5 rounded-full bg-brand-100 border-2 border-white flex-shrink-0 mt-0.5 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-brand-500" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase">Dropoff</p>
                        <p className="text-sm font-semibold text-slate-800">{order.dropAddress}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {isExpanded && activeTab === 'active' && (
                  <div className="p-4 bg-slate-50">
                    {nextAction && !isFailing && (
                      <div className="space-y-2">
                        <Button 
                          isLoading={updatingId === order.id}
                          onClick={() => updateStatus(order.id, nextAction.next)}
                          className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white"
                        >
                          <Navigation className="w-4 h-4" />
                          {nextAction.label}
                        </Button>
                        <button 
                          onClick={() => setFailingId(order.id)}
                          className="w-full py-2 text-sm text-slate-400 font-semibold hover:text-red-500 transition-colors"
                        >
                          Report Issue / Mark Failed
                        </button>
                      </div>
                    )}

                    {isFailing && (
                      <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                        <label className="block text-xs font-bold text-red-800 mb-2">Failure Reason</label>
                        <textarea
                          className="w-full bg-white rounded-lg border border-red-200 p-2 text-sm mb-3 focus:outline-none focus:border-red-400 transition-colors"
                          rows={2}
                          placeholder="e.g. Customer unavailable, Address not found"
                          value={failureNote}
                          onChange={e => setFailureNote(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <button 
                            onClick={() => { setFailingId(null); setFailureNote(''); }}
                            className="flex-1 py-2.5 bg-white text-slate-600 font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
                          >
                            Cancel
                          </button>
                          <Button 
                            isLoading={updatingId === order.id}
                            onClick={() => updateStatus(order.id, 'FAILED', failureNote)}
                            disabled={!failureNote.trim()}
                            className="flex-1 py-2.5 bg-red-500 text-white"
                          >
                            Confirm Fail
                          </Button>
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
