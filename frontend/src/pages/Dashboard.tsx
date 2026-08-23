import { useState, useEffect } from 'react';
import { Package, MapPin, Clock, AlertCircle, CalendarClock, CheckCircle2, Truck, Box } from 'lucide-react';
import Button from '../components/Button';
import { toast } from 'react-hot-toast';

export default function Dashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rescheduling, setRescheduling] = useState(false);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/orders/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders);
        if (data.orders.length > 0 && !selectedOrder) {
          fetchOrderDetail(data.orders[0].id);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderDetail = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/orders/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedOrder(data.order);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleReschedule = async () => {
    if (!selectedOrder) return;
    setRescheduling(true);
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/orders/${selectedOrder.id}/reschedule`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ preferredSlot: tomorrow.toISOString() })
      });
      if (res.ok) {
        toast.success('Order rescheduled successfully!');
        fetchOrderDetail(selectedOrder.id);
        fetchOrders();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to reschedule');
      }
    } catch (error) {
      toast.error('Network Error');
    } finally {
      setRescheduling(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const getStatusConfig = (status: string) => {
    switch(status) {
      case 'CREATED': return { color: 'text-slate-500', bg: 'bg-slate-100', icon: Box };
      case 'ASSIGNED': return { color: 'text-blue-500', bg: 'bg-blue-100', icon: Package };
      case 'PICKED_UP': return { color: 'text-indigo-500', bg: 'bg-indigo-100', icon: MapPin };
      case 'IN_TRANSIT': return { color: 'text-orange-500', bg: 'bg-orange-100', icon: Truck };
      case 'OUT_FOR_DELIVERY': return { color: 'text-brand-500', bg: 'bg-brand-100', icon: Clock };
      case 'DELIVERED': return { color: 'text-green-500', bg: 'bg-green-100', icon: CheckCircle2 };
      case 'FAILED': return { color: 'text-red-500', bg: 'bg-red-100', icon: AlertCircle };
      case 'RESCHEDULED': return { color: 'text-purple-500', bg: 'bg-purple-100', icon: CalendarClock };
      default: return { color: 'text-slate-500', bg: 'bg-slate-100', icon: Box };
    }
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-10rem)] flex gap-6">
      
      <div className="w-1/3 flex flex-col gap-4 overflow-y-auto px-2 -mx-2 custom-scrollbar">
        <h2 className="text-2xl font-bold text-slate-900 mb-2 pl-2 animate-fade-in-up">My Shipments</h2>
        
        {loading && <div className="text-slate-500 pl-2 animate-fade-in-up">Loading tracking data...</div>}
        
        {!loading && orders.length === 0 && (
          <div className="glass-panel p-6 rounded-3xl text-center text-slate-500 mx-2 animate-fade-in-up">
            No active shipments found.
          </div>
        )}

        {orders.map((order, index) => {
          const isSelected = selectedOrder?.id === order.id;
          const config = getStatusConfig(order.status);
          const Icon = config.icon;
          
          return (
            <div 
              key={order.id} 
              onClick={() => fetchOrderDetail(order.id)}
              className={`cursor-pointer transition-all duration-300 p-5 rounded-3xl border-2 animate-fade-in-up hover:scale-[1.02] hover:-translate-y-1 hover:shadow-lg ${
                isSelected ? 'border-brand-500 shadow-xl bg-white' : 'border-transparent glass hover:bg-white/90'
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex justify-between items-start mb-3">
                <div className={`p-2 rounded-xl ${config.bg}`}>
                  <Icon className={`w-5 h-5 ${config.color}`} />
                </div>
                <div className={`text-xs font-bold px-3 py-1 rounded-full ${config.bg} ${config.color}`}>
                  {order.status}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-semibold text-slate-900 truncate">To: {order.dropArea}</div>
                <div className="text-xs font-medium text-slate-500 font-mono">ID: {order.id}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="w-2/3 h-full animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        {selectedOrder ? (
          <div className="glass-panel h-full rounded-3xl p-6 overflow-y-auto flex flex-col relative custom-scrollbar">
            
            <div className="flex justify-between items-end border-b border-slate-100 pb-4 mb-4">
              <div>
                <div className="text-xs font-semibold text-brand-500 uppercase tracking-wider mb-1">Tracking ID</div>
                <div className="text-xl font-bold font-mono text-slate-900">{selectedOrder.id}</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-semibold text-slate-500 mb-1">ETA</div>
                <div className="text-sm font-bold text-slate-900">
                  {new Date(selectedOrder.estimatedDeliveryAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            <div className="flex-1 relative pl-2 mt-2">
              <div className="space-y-4 relative before:absolute before:top-[14px] before:bottom-[14px] before:left-[11px] before:w-0.5 before:bg-brand-500">
                {selectedOrder.trackingEvents.map((event: any, index: number) => {
                  const isLatest = index === selectedOrder.trackingEvents.length - 1;

                  return (
                    <div key={event.id} className="flex gap-4 relative animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${index * 50}ms` }}>
                      <div className={`relative z-10 w-6 h-6 rounded-full border-4 border-white ${isLatest ? 'bg-brand-500 shadow-[0_0_10px_rgba(20,184,166,0.8)] scale-110' : 'bg-brand-500'} flex-shrink-0 mt-0.5`} />
                      
                      <div className={`flex-1 glass p-3.5 rounded-xl ${isLatest ? 'border-brand-200 bg-white shadow-sm' : 'opacity-75'}`}>
                        <div className="flex justify-between items-center mb-0.5">
                          <h4 className={`font-bold ${isLatest ? 'text-slate-900 text-sm' : 'text-slate-500 text-sm'}`}>
                            {event.toStatus}
                          </h4>
                          <span className="text-[10px] font-semibold text-slate-400">
                            {new Date(event.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        {event.note && (
                          <p className={`text-xs mt-1.5 p-2 rounded-lg ${event.toStatus === 'FAILED' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-slate-50 text-slate-600'}`}>
                            {event.note}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {selectedOrder.status === 'FAILED' && (
              <div className="mt-8 p-6 bg-red-50 rounded-2xl border border-red-100 flex items-center justify-between animate-in fade-in">
                <div>
                  <h4 className="font-bold text-red-900">Delivery Failed</h4>
                  <p className="text-sm text-red-700">We couldn't complete the delivery. Please choose a new slot.</p>
                </div>
                <Button isLoading={rescheduling} onClick={handleReschedule} className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg transition-colors hover:scale-[1.02]">
                  Reschedule Order
                </Button>
              </div>
            )}
            
          </div>
        ) : (
          <div className="glass-panel h-full rounded-3xl flex flex-col items-center justify-center text-slate-400">
            <Package className="w-16 h-16 mb-4 opacity-50 text-brand-500" />
            <p className="text-lg font-medium">Select a shipment to track in real-time</p>
          </div>
        )}
      </div>
    </div>
  );
}
