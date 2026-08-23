import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PackageOpen, MapPin, Scale, Navigation, DollarSign, Clock } from 'lucide-react';
import SlideToConfirm from '../components/SlideToConfirm';

export default function CreateOrder() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<any>({
    pickupAddress: '',
    pickupArea: '',
    dropAddress: '',
    dropArea: '',
    length: '',
    breadth: '',
    height: '',
    actualWeight: '',
    type: 'B2C',
    paymentType: 'PREPAID'
  });

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const payload = {
        pickupAddress: form.pickupAddress,
        pickupAreaOrPincode: form.pickupArea,
        dropAddress: form.dropAddress,
        dropAreaOrPincode: form.dropArea,
        length: form.length,
        breadth: form.breadth,
        height: form.height,
        actualWeight: form.actualWeight,
        orderType: form.type,
        paymentType: form.paymentType
      };

      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/orders/preview`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate preview');

      setPreview(data);
      setStep(2);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const payload = {
        pickupAddress: form.pickupAddress,
        pickupAreaOrPincode: form.pickupArea,
        dropAddress: form.dropAddress,
        dropAreaOrPincode: form.dropArea,
        length: form.length,
        breadth: form.breadth,
        height: form.height,
        actualWeight: form.actualWeight,
        orderType: form.type,
        paymentType: form.paymentType
      };
      
      const token = localStorage.getItem('token');
      const idempotencyKey = `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const res = await fetch(`${import.meta.env.VITE_API_URL}/orders`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create order');

      navigate('/dashboard');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">New Shipment</h1>
          <p className="text-slate-500 mt-1">Book a new delivery with LastMile</p>
        </div>
        <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center">
          <PackageOpen className="w-6 h-6 text-brand-600" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6 rounded-3xl relative overflow-hidden">
            <div className={`transition-opacity duration-300 ${step === 2 ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
              
              <form onSubmit={handlePreview} className="space-y-6">
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center"><MapPin className="w-5 h-5 mr-2 text-brand-500" /> Locations</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Pickup Area/Pincode</label>
                      <input required type="text" className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white/50" value={form.pickupArea} onChange={e => setForm({...form, pickupArea: e.target.value})} placeholder="110001" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Drop Area/Pincode</label>
                      <input required type="text" className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white/50" value={form.dropArea} onChange={e => setForm({...form, dropArea: e.target.value})} placeholder="110007" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Pickup Full Address</label>
                      <textarea required className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white/50" value={form.pickupAddress} onChange={e => setForm({...form, pickupAddress: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Drop Full Address</label>
                      <textarea required className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white/50" value={form.dropAddress} onChange={e => setForm({...form, dropAddress: e.target.value})} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h3 className="text-lg font-semibold flex items-center"><Scale className="w-5 h-5 mr-2 text-brand-500" /> Dimensions & Weight</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">L (cm)</label>
                      <input required type="number" className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white/50" value={form.length} onChange={e => setForm({...form, length: e.target.value === '' ? '' : Number(e.target.value)})} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">W (cm)</label>
                      <input required type="number" className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white/50" value={form.breadth} onChange={e => setForm({...form, breadth: e.target.value === '' ? '' : Number(e.target.value)})} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">H (cm)</label>
                      <input required type="number" className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white/50" value={form.height} onChange={e => setForm({...form, height: e.target.value === '' ? '' : Number(e.target.value)})} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Wt (kg)</label>
                      <input required step="0.1" type="number" className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white/50" value={form.actualWeight} onChange={e => setForm({...form, actualWeight: e.target.value === '' ? '' : Number(e.target.value)})} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Type</label>
                      <select className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white/50" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                        <option value="B2C">B2C</option>
                        <option value="B2B">B2B</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Payment</label>
                      <select className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white/50" value={form.paymentType} onChange={e => setForm({...form, paymentType: e.target.value})}>
                        <option value="PREPAID">Prepaid</option>
                        <option value="COD">Cash on Delivery</option>
                      </select>
                    </div>
                  </div>
                </div>

                {step === 1 && (
                  <button type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-xl shadow-md transition-all">
                    {loading ? 'Calculating...' : 'Preview Pricing & ETA'}
                  </button>
                )}
              </form>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          {step === 2 && preview ? (
            <div className="glass-panel p-6 rounded-3xl sticky top-24 animate-in slide-in-from-bottom-4 fade-in duration-300">
              <h3 className="text-xl font-bold text-slate-900 mb-6">Order Summary</h3>
              
              <div className="space-y-6">
                
                <div>
                  <div className="flex items-center text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    <Navigation className="w-4 h-4 mr-2 text-brand-500" /> Zones Detected
                  </div>
                  <div className="bg-slate-100/50 p-3 rounded-xl space-y-1">
                    <div className="text-sm"><span className="text-slate-500">From:</span> <span className="font-medium text-slate-900">{preview.pickupZone}</span></div>
                    <div className="text-sm"><span className="text-slate-500">To:</span> <span className="font-medium text-slate-900">{preview.dropZone}</span></div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    <Scale className="w-4 h-4 mr-2 text-brand-500" /> Weight Calc
                  </div>
                  <div className="bg-slate-100/50 p-3 rounded-xl space-y-1 flex justify-between items-center text-sm">
                    <span className="text-slate-500">Billable Weight</span>
                    <span className="font-bold text-slate-900">{preview.billableWeight?.toFixed(1) || preview.billableWeight} kg</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    <DollarSign className="w-4 h-4 mr-2 text-brand-500" /> Charges
                  </div>
                  <div className="bg-slate-100/50 p-3 rounded-xl space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-slate-500">Base Freight</span><span className="font-medium">₹{preview.baseCharge}</span></div>
                    {preview.codSurcharge > 0 && <div className="flex justify-between"><span className="text-orange-500">COD Surcharge</span><span className="font-medium text-orange-600">₹{preview.codSurcharge}</span></div>}
                    <div className="border-t border-slate-200 my-2 pt-2 flex justify-between items-center">
                      <span className="font-bold text-slate-900">Total</span>
                      <span className="text-lg font-bold text-brand-600">₹{preview.totalCharge}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-brand-50 p-3 rounded-xl flex items-center">
                  <Clock className="w-5 h-5 text-brand-500 mr-3" />
                  <div>
                    <div className="text-xs font-semibold text-brand-600 uppercase">Est. Delivery</div>
                    <div className="text-sm font-bold text-slate-900">{preview.etaMinutes ? `Within ${Math.round(preview.etaMinutes / 60)} hours` : 'Pending Assignment'}</div>
                  </div>
                </div>

                <div className="pt-4">
                  <SlideToConfirm onConfirm={handleConfirm} isConfirming={loading} />
                </div>
                
                <button onClick={() => setStep(1)} className="w-full text-center text-xs font-semibold text-slate-400 hover:text-slate-600 mt-4 transition-colors">
                  Edit Details
                </button>
              </div>
            </div>
          ) : (
            <div className="glass-panel p-6 rounded-3xl h-full flex flex-col items-center justify-center text-slate-400 border-dashed border-2">
              <PackageOpen className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-sm font-medium text-center">Fill out the details to see your pricing and ETA preview.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
