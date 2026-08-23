import { useState, useEffect } from 'react';
import { Shield, Settings, Users, Package, RefreshCw, Zap, MapPin, Plus, DollarSign, PlusCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Button from '../components/Button';

export default function AdminDashboard() {
  const [tab, setTab] = useState<'orders' | 'fleet' | 'config'>('orders');
  const [data, setData] = useState<any>({ orders: [], agents: [], zones: [], ratecards: [], etas: [], areas: [], customers: [] });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState('');
  const [filterZone, setFilterZone] = useState('');
  const [filterAgent, setFilterAgent] = useState('');

  const [newAgent, setNewAgent] = useState({ name: '', email: '', password: '' });
  const [newZone, setNewZone] = useState({ name: '' });
  const [newArea, setNewArea] = useState({ name: '', pincode: '', zoneId: '' });
  const [newRate, setNewRate] = useState({ zoneId: '', orderType: 'B2C', isIntraZone: 'true', ratePerKg: 0, codSurcharge: 0 });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOrder, setNewOrder] = useState<any>({ customerId: '', pickupAddress: '', dropAddress: '', pickupAreaOrPincode: '', dropAreaOrPincode: '', length: '', breadth: '', height: '', actualWeight: '', orderType: 'B2C', paymentType: 'PREPAID' });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [ordersRes, agentsRes, zonesRes, ratesRes, areasRes, etasRes, customersRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/admin/orders`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL}/admin/agents`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL}/admin/zones`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL}/admin/ratecards`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL}/admin/areas`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL}/admin/etas`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL}/admin/customers`, { headers })
      ]);
      setData({
        orders: await ordersRes.json(),
        agents: await agentsRes.json(),
        zones: await zonesRes.json(),
        ratecards: await ratesRes.json(),
        areas: await areasRes.json(),
        etas: await etasRes.json(),
        customers: await customersRes.json()
      });
    } catch (e) {
      console.error(e);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const req = async (url: string, method: string, body: any, successMsg: string) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${import.meta.env.VITE_API_URL}${url}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const e = await res.json();
      throw new Error(e.error || 'Request failed');
    }
    toast.success(successMsg);
  };

  const handleAutoAssign = async (id: string) => {
    setUpdating(`assign-${id}`);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/orders/${id}/auto-assign`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      toast.success(`Assigned! Reason: ${data.explanation}`);
      fetchAll();
    } catch (err: any) { toast.error(err.message); }
    finally { setUpdating(null); }
  };

  const handleForceStatus = async (id: string, status: string) => {
    const note = prompt('Enter reason for force override:');
    if (!note) return;
    setUpdating(`status-${id}`);
    try {
      await req(`/admin/orders/${id}/status`, 'PUT', { status, note }, 'Status overridden');
      fetchAll();
    } catch (err: any) { toast.error(err.message); }
    finally { setUpdating(null); }
  };

  const handleCreateAgent = async (e: any) => {
    e.preventDefault();
    setUpdating('agent');
    try {
      await req('/admin/agents', 'POST', newAgent, 'Agent created successfully');
      setNewAgent({ name: '', email: '', password: '' });
      fetchAll();
    } catch (err: any) { toast.error(err.message); }
    finally { setUpdating(null); }
  };

  const handleCreateZone = async (e: any) => {
    e.preventDefault();
    setUpdating('zone');
    try {
      await req('/admin/zones', 'POST', newZone, 'Zone created successfully');
      setNewZone({ name: '' });
      fetchAll();
    } catch (err: any) { toast.error(err.message); }
    finally { setUpdating(null); }
  };

  const handleCreateArea = async (e: any) => {
    e.preventDefault();
    setUpdating('area');
    try {
      await req('/admin/areas', 'POST', newArea, 'Area mapped successfully');
      setNewArea({ name: '', pincode: '', zoneId: '' });
      fetchAll();
    } catch (err: any) { toast.error(err.message); }
    finally { setUpdating(null); }
  };

  const handleCreateRate = async (e: any) => {
    e.preventDefault();
    setUpdating('rate');
    try {
      await req('/admin/ratecards', 'POST', { ...newRate, isIntraZone: newRate.isIntraZone === 'true' }, 'Rate card configured successfully');
      setNewRate({ zoneId: '', orderType: 'B2C', isIntraZone: 'true', ratePerKg: 0, codSurcharge: 0 });
      fetchAll();
    } catch (err: any) { toast.error(err.message); }
    finally { setUpdating(null); }
  };

  const handleCreateOrder = async (e: any) => {
    e.preventDefault();
    setUpdating('order');
    try {
      await req('/admin/orders', 'POST', newOrder, 'Order created successfully');
      setShowCreateModal(false);
      fetchAll();
    } catch (err: any) { toast.error(err.message); }
    finally { setUpdating(null); }
  };

  const getWorkload = (agentId: string) => {
    return data.orders.filter((o: any) => o.agentId === agentId && !['DELIVERED', 'FAILED'].includes(o.status)).length;
  };

  const filteredOrders = data.orders.filter((o: any) => {
    if (filterStatus && o.status !== filterStatus) return false;
    if (filterZone && o.pickupZoneId !== filterZone) return false;
    if (filterAgent === 'unassigned') return !o.agentId;
    if (filterAgent && filterAgent !== 'unassigned' && o.agentId !== filterAgent) return false;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto pb-12 relative">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center">
            <Shield className="w-8 h-8 mr-3 text-red-600" /> System Control
          </h1>
          <p className="text-slate-500 mt-1">Global administrative overview</p>
        </div>
        <div className="flex space-x-2">
          <button onClick={fetchAll} className="p-3 bg-white rounded-full shadow hover:bg-slate-50 transition-colors">
            <RefreshCw className={`w-5 h-5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={() => { localStorage.clear(); window.location.href = '/login'; }} 
            className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-full shadow flex items-center transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2">
          <button onClick={() => setTab('orders')} className={`px-6 py-2 rounded-full font-bold text-sm ${tab === 'orders' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'}`}><Package className="w-4 h-4 inline mr-2"/> Orders</button>
          <button onClick={() => setTab('fleet')} className={`px-6 py-2 rounded-full font-bold text-sm ${tab === 'fleet' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'}`}><Users className="w-4 h-4 inline mr-2"/> Fleet</button>
          <button onClick={() => setTab('config')} className={`px-6 py-2 rounded-full font-bold text-sm ${tab === 'config' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'}`}><Settings className="w-4 h-4 inline mr-2"/> Config</button>
        </div>
        {tab === 'orders' && (
          <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-full shadow flex items-center text-sm">
            <PlusCircle className="w-4 h-4 mr-2" /> Create Order
          </button>
        )}
      </div>

      <div className="glass-panel rounded-3xl p-6 min-h-[500px]">
        {loading && !data.orders.length ? (
          <div className="text-center text-slate-400 py-12">Fetching system state...</div>
        ) : tab === 'orders' ? (
          <div>
            <div className="flex gap-3 mb-6 flex-wrap">
              <select className="px-3 py-2 bg-white rounded-lg border border-slate-200 text-sm font-semibold text-slate-600" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="CREATED">CREATED</option>
                <option value="ASSIGNED">ASSIGNED</option>
                <option value="PICKED_UP">PICKED_UP</option>
                <option value="IN_TRANSIT">IN_TRANSIT</option>
                <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</option>
                <option value="DELIVERED">DELIVERED</option>
                <option value="FAILED">FAILED</option>
              </select>
              <select className="px-3 py-2 bg-white rounded-lg border border-slate-200 text-sm font-semibold text-slate-600" value={filterZone} onChange={e => setFilterZone(e.target.value)}>
                <option value="">All Pick-up Zones</option>
                {data.zones.map((z:any) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
              <select className="px-3 py-2 bg-white rounded-lg border border-slate-200 text-sm font-semibold text-slate-600" value={filterAgent} onChange={e => setFilterAgent(e.target.value)}>
                <option value="">All Agents</option>
                <option value="unassigned">Unassigned Only</option>
                {data.agents.map((a:any) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-slate-500 uppercase border-b border-slate-200">
                  <tr><th className="pb-3 font-semibold">ID</th><th className="pb-3 font-semibold">Status</th><th className="pb-3 font-semibold">Agent</th><th className="pb-3 font-semibold text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.length === 0 ? <tr><td colSpan={4} className="py-8 text-center text-slate-400">No orders match filters</td></tr> : filteredOrders.map((o: any) => (
                    <tr key={o.id} className="hover:bg-slate-50/50">
                      <td className="py-4 font-mono text-xs">{o.id}</td>
                      <td className="py-4"><span className="px-2 py-1 bg-slate-100 rounded-md font-bold text-xs">{o.status}</span></td>
                      <td className="py-4 text-slate-500">{o.agentId ? (data.agents.find((a:any) => a.id === o.agentId)?.name || o.agentId.slice(-8)) : 'Unassigned'}</td>
                      <td className="py-4 text-right space-x-2">
                        {!o.agentId && ['CREATED', 'RESCHEDULED'].includes(o.status) && (
                          <button onClick={() => handleAutoAssign(o.id)} className="px-3 py-1 bg-brand-500 text-white rounded text-xs font-bold hover:bg-brand-600"><Zap className="w-3 h-3 inline mr-1"/> Auto</button>
                        )}
                        <select 
                          onChange={(e) => handleForceStatus(o.id, e.target.value)} 
                          value=""
                          className="px-2 py-1 bg-red-50 text-red-600 border border-red-200 rounded text-xs font-bold outline-none cursor-pointer"
                        >
                          <option value="" disabled>Force Status...</option>
                          <option value="DELIVERED">DELIVERED</option>
                          <option value="FAILED">FAILED</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : tab === 'fleet' ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {data.agents.map((a: any) => (
              <div key={a.id} className="p-4 border border-slate-200 rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow">
                <div className="font-bold flex justify-between items-center text-slate-900">
                  {a.name}
                  <span className={`px-2 py-1 text-[10px] uppercase font-bold rounded-full ${a.availability === 'AVAILABLE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {a.availability}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-3 flex justify-between">
                  <span>Active Workload:</span> 
                  <span className="font-bold text-slate-800 text-sm bg-slate-100 px-2 rounded-full">{getWorkload(a.id)}</span>
                </div>
                <div className="text-xs text-slate-500 mt-2 truncate">
                  Zone: {a.currentZoneId ? data.zones.find((z:any)=>z.id===a.currentZoneId)?.name || a.currentZoneId : 'Any'}
                </div>
                <div className="text-xs text-slate-400 mt-1 truncate">Email: {a.email}</div>
              </div>
            ))}
            {data.agents.length === 0 && <div className="col-span-full text-center text-slate-400 py-8">No agents found</div>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            <div className="space-y-6">
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center"><MapPin className="w-5 h-5 mr-2 text-brand-500"/> Zones</h3>
                <form onSubmit={handleCreateZone} className="flex gap-2 mb-4">
                  <input required type="text" placeholder="New Zone Name" className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm" value={newZone.name} onChange={e => setNewZone({name: e.target.value})} />
                  <Button isLoading={updating === 'zone'} type="submit" className="bg-brand-500 text-white px-3 py-2 rounded-lg hover:bg-brand-600"><Plus className="w-4 h-4"/></Button>
                </form>
                <ul className="text-sm space-y-2 max-h-32 overflow-y-auto">
                  {data.zones.map((z: any) => (
                    <li key={z.id} className="flex justify-between bg-white p-3 rounded-lg shadow-sm border border-slate-100">
                      <span className="font-medium text-slate-700">{z.name}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center"><MapPin className="w-5 h-5 mr-2 text-brand-500"/> Assign Areas to Zone</h3>
                <form onSubmit={handleCreateArea} className="grid grid-cols-2 gap-2 mb-4 text-sm">
                  <input required type="text" placeholder="Area Name" className="px-3 py-2 rounded-lg border border-slate-200" value={newArea.name} onChange={e => setNewArea({...newArea, name: e.target.value})} />
                  <input type="text" placeholder="Pincode (optional)" className="px-3 py-2 rounded-lg border border-slate-200" value={newArea.pincode} onChange={e => setNewArea({...newArea, pincode: e.target.value})} />
                  <select required className="col-span-2 px-3 py-2 rounded-lg border border-slate-200" value={newArea.zoneId} onChange={e => setNewArea({...newArea, zoneId: e.target.value})}>
                    <option value="">Select Zone...</option>
                    {data.zones.map((z:any) => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
                  <Button isLoading={updating === 'area'} type="submit" className="col-span-2 bg-brand-500 text-white px-3 py-2 rounded-lg hover:bg-brand-600 font-bold">Assign Area</Button>
                </form>
              </div>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center"><DollarSign className="w-5 h-5 mr-2 text-brand-500"/> Pricing Rates</h3>
              <form onSubmit={handleCreateRate} className="grid grid-cols-2 gap-2 mb-4 text-sm">
                <select required className="col-span-2 px-3 py-2 rounded-lg border border-slate-200" value={newRate.zoneId} onChange={e => setNewRate({...newRate, zoneId: e.target.value})}>
                  <option value="">Select Zone...</option>
                  {data.zones.map((z:any)=><option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
                <select className="px-3 py-2 rounded-lg border border-slate-200" value={newRate.orderType} onChange={e => setNewRate({...newRate, orderType: e.target.value})}>
                  <option value="B2C">B2C</option>
                  <option value="B2B">B2B</option>
                </select>
                <select className="px-3 py-2 rounded-lg border border-slate-200" value={newRate.isIntraZone} onChange={e => setNewRate({...newRate, isIntraZone: e.target.value})}>
                  <option value="true">Intra-Zone</option>
                  <option value="false">Inter-Zone</option>
                </select>
                <input required type="number" placeholder="Rate/Kg" className="px-3 py-2 rounded-lg border border-slate-200" value={newRate.ratePerKg || ''} onChange={e => setNewRate({...newRate, ratePerKg: Number(e.target.value)})} />
                <input type="number" placeholder="COD Surcharge" className="px-3 py-2 rounded-lg border border-slate-200" value={newRate.codSurcharge || ''} onChange={e => setNewRate({...newRate, codSurcharge: Number(e.target.value)})} />
                <Button isLoading={updating === 'rate'} type="submit" className="col-span-2 bg-brand-500 text-white px-3 py-2 rounded-lg hover:bg-brand-600 font-bold">Add Rate Card</Button>
              </form>
              <ul className="text-xs space-y-2 max-h-48 overflow-y-auto">
                {data.ratecards.map((r: any) => (
                  <li key={r.id} className="flex justify-between bg-white p-2 rounded shadow-sm border border-slate-100 items-center">
                    <div>
                      <span className="font-bold">{data.zones.find((z:any)=>z.id===r.zoneId)?.name || 'Zone'}</span>
                      <span className="text-slate-400 mx-1">•</span>
                      <span>{r.orderType} {r.isIntraZone ? '(Intra)' : '(Inter)'}</span>
                    </div>
                    <div className="font-bold text-brand-600">₹{r.ratePerKg}/kg {r.codSurcharge > 0 && <span className="text-orange-500 text-[10px] ml-1">+₹{r.codSurcharge} COD</span>}</div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 md:col-span-2">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center"><Users className="w-5 h-5 mr-2 text-brand-500"/> Create Driver Account</h3>
              <form onSubmit={handleCreateAgent} className="flex flex-col md:flex-row gap-2">
                <input required type="text" placeholder="Name" className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm" value={newAgent.name} onChange={e => setNewAgent({...newAgent, name: e.target.value})} />
                <input required type="email" placeholder="Email" className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm" value={newAgent.email} onChange={e => setNewAgent({...newAgent, email: e.target.value})} />
                <input required type="password" placeholder="Password" className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm" value={newAgent.password} onChange={e => setNewAgent({...newAgent, password: e.target.value})} />
                <Button isLoading={updating === 'agent'} type="submit" className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 font-bold text-sm whitespace-nowrap">Create Agent</Button>
              </form>
            </div>

          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Create Order (On Behalf)</h2>
            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Customer</label>
                <select required className="w-full px-3 py-2 rounded-lg border border-slate-200" value={newOrder.customerId} onChange={e => setNewOrder({...newOrder, customerId: e.target.value})}>
                  <option value="">Select Customer...</option>
                  {data.customers.map((c:any) => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Pickup Area/Pincode</label>
                  <input required type="text" className="w-full px-3 py-2 rounded-lg border border-slate-200" value={newOrder.pickupAreaOrPincode} onChange={e => setNewOrder({...newOrder, pickupAreaOrPincode: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Drop Area/Pincode</label>
                  <input required type="text" className="w-full px-3 py-2 rounded-lg border border-slate-200" value={newOrder.dropAreaOrPincode} onChange={e => setNewOrder({...newOrder, dropAreaOrPincode: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Pickup Full Address</label>
                <input required type="text" className="w-full px-3 py-2 rounded-lg border border-slate-200" value={newOrder.pickupAddress} onChange={e => setNewOrder({...newOrder, pickupAddress: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Drop Full Address</label>
                <input required type="text" className="w-full px-3 py-2 rounded-lg border border-slate-200" value={newOrder.dropAddress} onChange={e => setNewOrder({...newOrder, dropAddress: e.target.value})} />
              </div>
              
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">L(cm)</label>
                  <input required type="number" className="w-full px-2 py-2 rounded-lg border border-slate-200" value={newOrder.length} onChange={e => setNewOrder({...newOrder, length: e.target.value === '' ? '' : Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">W(cm)</label>
                  <input required type="number" className="w-full px-2 py-2 rounded-lg border border-slate-200" value={newOrder.breadth} onChange={e => setNewOrder({...newOrder, breadth: e.target.value === '' ? '' : Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">H(cm)</label>
                  <input required type="number" className="w-full px-2 py-2 rounded-lg border border-slate-200" value={newOrder.height} onChange={e => setNewOrder({...newOrder, height: e.target.value === '' ? '' : Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Wt(kg)</label>
                  <input required step="0.1" type="number" className="w-full px-2 py-2 rounded-lg border border-slate-200" value={newOrder.actualWeight} onChange={e => setNewOrder({...newOrder, actualWeight: e.target.value === '' ? '' : Number(e.target.value)})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Order Type</label>
                  <select className="w-full px-3 py-2 rounded-lg border border-slate-200" value={newOrder.orderType} onChange={e => setNewOrder({...newOrder, orderType: e.target.value})}>
                    <option value="B2C">B2C</option>
                    <option value="B2B">B2B</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Payment</label>
                  <select className="w-full px-3 py-2 rounded-lg border border-slate-200" value={newOrder.paymentType} onChange={e => setNewOrder({...newOrder, paymentType: e.target.value})}>
                    <option value="PREPAID">Prepaid</option>
                    <option value="COD">COD</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl">Cancel</button>
                <Button isLoading={updating === 'order'} type="submit" className="flex-1 py-3 bg-brand-500 text-white font-bold rounded-xl shadow">Create Order</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
