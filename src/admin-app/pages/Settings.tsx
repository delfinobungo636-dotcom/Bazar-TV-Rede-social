import React, { useState, useEffect } from 'react';
import { 
  Settings, Save, Phone, Mail, Globe, ShieldAlert, Loader2, 
  CheckCircle, AlertCircle, DollarSign, MonitorPlay, 
  Activity, Key, HardDrive, Wifi, EyeOff
} from 'lucide-react';
import { db } from '../../shared/services/firebase';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';

// --- INTERFACES PRINCIPAIS ---
interface PricingConfig {
  mobile: number;
  standard: number;
  premium: number;
  familia: number;
}

interface PlatformConfig {
  platformName: string;
  supportEmail: string;
  supportWhatsapp: string;
  maintenanceMode: boolean;
  freeTrialDays: number;
  allowVpn: boolean;
  maxSimultaneousLogins: number;
  maxVideoQuality: '1080p' | '720p' | '480p';
  dataSaverMode: boolean;
  pricing: PricingConfig;
}

// --- INTERFACES DOS COMPONENTES VISUAIS (Fim dos 'any') ---
interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

interface InputFieldProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  icon?: React.ReactNode;
  mono?: boolean;
}

interface PriceFieldProps {
  label: string;
  value: number;
  onChange: (val: string) => void;
  color: string;
}

interface ToggleCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  color: 'red' | 'green';
}

const AdminSettings = () => {
  const [saving, setSaving] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<{ type: string; text: string }>({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState<'geral' | 'financeiro' | 'streaming' | 'seguranca'>('geral');

  // O estado Cérebro da Aplicação
  const [config, setConfig] = useState<PlatformConfig>({
    platformName: 'Bazar TV',
    supportEmail: 'geral@bazartv.ao',
    supportWhatsapp: '244928420341',
    maintenanceMode: false,
    freeTrialDays: 0,
    allowVpn: true,
    maxSimultaneousLogins: 4,
    maxVideoQuality: '1080p',
    dataSaverMode: false,
    pricing: { mobile: 1000, standard: 2999, premium: 3999, familia: 4999 }
  });

  // 1. LER EM TEMPO REAL DO FIREBASE
  useEffect(() => {
    const docRef = doc(db, 'settings', 'platform');
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setConfig(prev => ({
          ...prev,
          ...data,
          pricing: data.pricing || prev.pricing
        }));
      }
      setLoading(false);
    }, (error) => {
      console.error("Erro ao ler configurações:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. GUARDAR ALTERAÇÕES NA BASE DE DADOS
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      await setDoc(doc(db, 'settings', 'platform'), {
        ...config,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setMessage({ type: 'success', text: 'Parâmetros do Servidor atualizados com sucesso! 🚀' });
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Erro ao injetar configurações na base de dados.' });
    } finally {
      setSaving(false);
    }
  };

  const handlePriceChange = (plan: keyof PricingConfig, value: string) => {
    setConfig(prev => ({
      ...prev,
      pricing: { ...prev.pricing, [plan]: Number(value) }
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030303] flex flex-col items-center justify-center w-full">
        <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
        <p className="text-zinc-500 font-mono text-xs animate-pulse tracking-widest">A carregar Kernel de Configurações...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-[#030303] min-h-screen text-zinc-200 w-full font-sans selection:bg-blue-500/30">
      <div className="max-w-6xl mx-auto">
        
        {/* CABEÇALHO */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10 border-b border-zinc-900 pb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-[0_0_25px_rgba(37,99,235,0.2)] border border-blue-500/50">
              <Settings size={24} fill="white" />
            </div>
            <div>
              <h1 className="text-3xl font-black italic tracking-tighter text-white">SYSTEM <span className="text-blue-500">CONFIG</span></h1>
              <p className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest mt-1">Painel de Controlo Master v6.0</p>
            </div>
          </div>
          
          {/* MENSAGENS FLUTUANTES */}
          {message.text && (
            <div className={`px-4 py-3 rounded-xl flex items-center gap-3 font-bold text-xs uppercase tracking-widest animate-in fade-in slide-in-from-top-4 ${
              message.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'
            }`}>
              {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {message.text}
            </div>
          )}
        </header>

        <form onSubmit={handleSave} className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* MENU LATERAL DE TABS */}
          <div className="xl:col-span-3 space-y-2">
            <TabButton active={activeTab === 'geral'} onClick={() => setActiveTab('geral')} icon={<Globe size={16}/>} label="Identidade & Contactos" />
            <TabButton active={activeTab === 'financeiro'} onClick={() => setActiveTab('financeiro')} icon={<DollarSign size={16}/>} label="Planos & Preços" />
            <TabButton active={activeTab === 'streaming'} onClick={() => setActiveTab('streaming')} icon={<MonitorPlay size={16}/>} label="Motor de Streaming" />
            <TabButton active={activeTab === 'seguranca'} onClick={() => setActiveTab('seguranca')} icon={<ShieldAlert size={16}/>} label="Segurança & Acesso" />
            
            <div className="mt-12 pt-8 border-t border-zinc-900">
              <button 
                type="submit" 
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs disabled:opacity-50 disabled:grayscale"
              >
                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                {saving ? 'A INJETAR DADOS...' : 'APLICAR MUDANÇAS'}
              </button>
              <p className="text-[9px] text-zinc-600 text-center mt-4 font-mono">As alterações propagam-se nos telemóveis dos clientes em tempo real (1.2s).</p>
            </div>
          </div>

          {/* ÁREA CENTRAL DE CONTEÚDO */}
          <div className="xl:col-span-9 bg-zinc-900/20 border border-zinc-800 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
            
            {/* TAB: GERAL */}
            {activeTab === 'geral' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex items-center gap-3 mb-6">
                  <Globe className="text-blue-500" size={24} />
                  <h2 className="text-xl font-black text-white tracking-tight uppercase">Identidade da Plataforma</h2>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <InputField 
                    label="Nome Público do Serviço" 
                    value={config.platformName} 
                    onChange={e => setConfig({...config, platformName: e.target.value})} 
                    placeholder="Ex: Bazar TV" 
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputField 
                      label="Email de Suporte ao Cliente" 
                      value={config.supportEmail} 
                      onChange={e => setConfig({...config, supportEmail: e.target.value})} 
                      placeholder="ajuda@bazartv.ao" 
                      icon={<Mail size={16} className="text-zinc-500"/>}
                    />
                    <InputField 
                      label="WhatsApp de Apoio (MCX Express)" 
                      value={config.supportWhatsapp} 
                      onChange={e => setConfig({...config, supportWhatsapp: e.target.value})} 
                      placeholder="244920000000" 
                      icon={<Phone size={16} className="text-zinc-500"/>}
                      mono
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB: FINANCEIRO */}
            {activeTab === 'financeiro' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex items-center gap-3 mb-6">
                  <DollarSign className="text-green-500" size={24} />
                  <h2 className="text-xl font-black text-white tracking-tight uppercase">Precificação Dinâmica (Kz)</h2>
                </div>
                <p className="text-xs text-zinc-500 mb-8 border-l-2 border-green-500 pl-3">
                  A alteração destes valores reflete-se imediatamente na App do cliente e na página de Pagamentos.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <PriceField label="Plano Mobile (1 Ecrã)" value={config.pricing.mobile} onChange={v => handlePriceChange('mobile', v)} color="border-blue-500/30" />
                  <PriceField label="Plano Standard (PC/TV)" value={config.pricing.standard} onChange={v => handlePriceChange('standard', v)} color="border-emerald-500/30" />
                  <PriceField label="Plano Premium (4K + Lives)" value={config.pricing.premium} onChange={v => handlePriceChange('premium', v)} color="border-purple-500/30" />
                  <PriceField label="Plano Família (4 Ecrãs)" value={config.pricing.familia} onChange={v => handlePriceChange('familia', v)} color="border-orange-500/30" />
                </div>
                
                <div className="mt-8 pt-8 border-t border-zinc-800">
                  <div className="flex justify-between items-center bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
                    <div>
                      <h3 className="font-bold text-white text-sm uppercase tracking-widest flex items-center gap-2">
                        <Activity size={16} className="text-blue-500"/> Dias de Avaliação Grátis (Trial)
                      </h3>
                      <p className="text-xs text-zinc-500 mt-1">Quantos dias um utilizador novo pode usar antes de pagar?</p>
                    </div>
                    <div className="flex items-center gap-3 bg-black p-2 rounded-xl border border-zinc-700">
                      <button type="button" onClick={() => setConfig({...config, freeTrialDays: Math.max(0, config.freeTrialDays - 1)})} className="w-8 h-8 flex items-center justify-center bg-zinc-800 rounded-lg hover:bg-zinc-700 text-white font-bold">-</button>
                      <span className="w-8 text-center font-mono font-bold text-white">{config.freeTrialDays}</span>
                      <button type="button" onClick={() => setConfig({...config, freeTrialDays: config.freeTrialDays + 1})} className="w-8 h-8 flex items-center justify-center bg-zinc-800 rounded-lg hover:bg-zinc-700 text-white font-bold">+</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: MOTOR DE STREAMING (CDN) */}
            {activeTab === 'streaming' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex items-center gap-3 mb-6">
                  <HardDrive className="text-purple-500" size={24} />
                  <h2 className="text-xl font-black text-white tracking-tight uppercase">Otimização de Infraestrutura (CDN)</h2>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
                    <h3 className="font-bold text-white text-xs uppercase tracking-widest mb-4">Qualidade Máxima de Transmissão</h3>
                    <div className="flex gap-4">
                      {['1080p', '720p', '480p'].map((quality) => (
                        <button
                          key={quality}
                          type="button"
                          onClick={() => setConfig({...config, maxVideoQuality: quality as '1080p' | '720p' | '480p'})}
                          className={`flex-1 py-4 rounded-xl font-bold font-mono text-sm border transition-all ${
                            config.maxVideoQuality === quality 
                              ? 'bg-purple-600/20 border-purple-500 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]' 
                              : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-600'
                          }`}
                        >
                          {quality}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-4 italic">Se os custos do Firebase Storage estiverem altos, baixa a qualidade máxima para 720p para forçar compressão de banda em todos os clientes.</p>
                  </div>

                  <ToggleCard 
                    icon={<Wifi size={20} className={config.dataSaverMode ? 'text-green-500' : 'text-zinc-500'} />}
                    title="Modo Poupança de Dados Extremo"
                    description="Reduz drasticamente o consumo de internet dos teus clientes. Ideal para redes móveis fracas."
                    checked={config.dataSaverMode}
                    onChange={(val) => setConfig({...config, dataSaverMode: val})}
                    color="green"
                  />
                </div>
              </div>
            )}

            {/* TAB: SEGURANÇA E ACESSO */}
            {activeTab === 'seguranca' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex items-center gap-3 mb-6">
                  <ShieldAlert className="text-red-500" size={24} />
                  <h2 className="text-xl font-black text-white tracking-tight uppercase">Protocolos de Segurança</h2>
                </div>

                <div className="space-y-6">
                  <ToggleCard 
                    icon={<Key size={20} className={config.allowVpn ? 'text-green-500' : 'text-red-500'} />}
                    title="Permitir Conexões via VPN"
                    description="Se desativado, bloqueia utilizadores que tentem mascarar o seu Endereço IP real (Proteção Anti-Fraude)."
                    checked={config.allowVpn}
                    onChange={(val) => setConfig({...config, allowVpn: val})}
                    color="red"
                  />

                  <ToggleCard 
                    icon={<EyeOff size={20} className={config.maintenanceMode ? 'text-red-500' : 'text-zinc-500'} />}
                    title="Modo de Manutenção Restrito (Kill Switch)"
                    description="Derruba todas as sessões ativas e mostra um ecrã de 'Sistema em Atualização'. Apenas o acesso Admin funciona."
                    checked={config.maintenanceMode}
                    onChange={(val) => setConfig({...config, maintenanceMode: val})}
                    color="red"
                  />

                  <div className="bg-red-900/10 p-6 rounded-2xl border border-red-900/30">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-red-400 text-sm uppercase tracking-widest">Tolerância a Partilha de Contas</h3>
                        <p className="text-xs text-zinc-500 mt-1 max-w-md">Limite de aparelhos ligados ao mesmo tempo na mesma conta antes do bloqueio automático.</p>
                      </div>
                      <select 
                        value={config.maxSimultaneousLogins}
                        onChange={e => setConfig({...config, maxSimultaneousLogins: Number(e.target.value)})}
                        className="bg-black border border-red-900/50 text-white p-3 rounded-xl outline-none focus:border-red-500 font-mono font-bold"
                      >
                        <option value={1}>Estrito (1 Ecrã)</option>
                        <option value={2}>Moderado (2 Ecrãs)</option>
                        <option value={4}>Família (4 Ecrãs)</option>
                        <option value={10}>Livre (Ilimitado)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
          </div>
        </form>
      </div>
    </div>
  );
};

// --- COMPONENTES ATÓMICOS REUTILIZÁVEIS E TIPADOS ---

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, icon, label }) => (
  <button 
    type="button"
    onClick={onClick}
    className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] transition-all border ${
      active 
        ? 'bg-blue-600/10 border-blue-500/30 text-blue-400 translate-x-2' 
        : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50 hover:translate-x-1'
    }`}
  >
    {icon} {label}
  </button>
);

const InputField: React.FC<InputFieldProps> = ({ label, value, onChange, placeholder, icon, mono }) => (
  <div>
    <label className="text-[10px] uppercase font-black tracking-widest text-zinc-500 mb-2 block">{label}</label>
    <div className="flex items-center gap-3 bg-black border border-zinc-800 rounded-2xl p-4 focus-within:border-blue-500 transition-colors shadow-inner">
      {icon}
      <input 
        type="text" 
        value={value}
        onChange={onChange}
        className={`bg-transparent w-full outline-none text-white text-sm ${mono ? 'font-mono' : ''}`}
        placeholder={placeholder}
      />
    </div>
  </div>
);

const PriceField: React.FC<PriceFieldProps> = ({ label, value, onChange, color }) => (
  <div className={`bg-black/50 p-5 rounded-2xl border ${color} focus-within:bg-zinc-900 transition-colors`}>
    <label className="text-[10px] uppercase font-black tracking-widest text-zinc-400 mb-3 block">{label}</label>
    <div className="flex items-center gap-2">
      <span className="text-zinc-600 font-bold">Kz</span>
      <input 
        type="number" 
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-transparent w-full outline-none text-white text-2xl font-black font-mono"
      />
    </div>
  </div>
);

const ToggleCard: React.FC<ToggleCardProps> = ({ icon, title, description, checked, onChange, color }) => {
  const isRed = color === 'red';
  return (
    <div className={`p-6 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 ${
      checked 
        ? (isRed ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30') 
        : 'bg-zinc-900/50 border-zinc-800'
    }`}>
      <div className="flex gap-4">
        <div className={`mt-1 shrink-0 ${checked ? (isRed ? 'text-red-400' : 'text-green-400') : 'text-zinc-600'}`}>
          {icon}
        </div>
        <div>
          <h3 className={`font-bold text-sm uppercase tracking-widest ${checked ? (isRed ? 'text-red-400' : 'text-green-400') : 'text-white'}`}>{title}</h3>
          <p className="text-xs text-zinc-500 mt-2 max-w-lg leading-relaxed">{description}</p>
        </div>
      </div>
      
      <label className="relative inline-flex items-center cursor-pointer shrink-0">
        <input 
          type="checkbox" 
          className="sr-only peer" 
          checked={checked}
          onChange={e => onChange(e.target.checked)}
        />
        <div className={`w-14 h-7 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all ${isRed ? 'peer-checked:bg-red-500' : 'peer-checked:bg-green-500'}`}></div>
      </label>
    </div>
  );
};

export default AdminSettings;