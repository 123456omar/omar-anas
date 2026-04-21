/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Sun, 
  CloudSun, 
  Cloud, 
  CloudFog, 
  CloudDrizzle, 
  CloudRain, 
  Snowflake, 
  CloudRainWind, 
  CloudLightning,
  Droplets,
  Wind,
  Search,
  MapPin,
  Loader2,
  Sparkles,
  ArrowDownCircle,
  ArrowUpCircle,
  Bell,
  Settings,
  X,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Trash2,
  Plus,
  Waves,
  Navigation,
  Mountain,
  Sprout,
  Info,
  Share2,
  Newspaper,
  Megaphone,
  Menu,
  History,
  User,
  Home,
  Globe,
  Settings2,
  Trees,
  Tent,
  Shrub,
  Fish,
  Eye,
  Anchor,
  Radar,
  Radio,
  TowerControl as Tower,
  Globe2,
  ShieldAlert,
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { WeatherData, LocationInfo, AlertConfig, AlertType } from './types';
import { fetchWeather, searchLocation, WEATHER_CODES } from './services/weatherService';
import { getDetailedWeatherInsight, getWeatherNews, getFishingHotspots, broadcastObservatoryAlert } from './services/geminiService';

const ICON_MAP: Record<string, any> = {
  Sun,
  CloudSun,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  Snowflake,
  CloudRainWind,
  CloudLightning,
};

// Fix for icon casing
const snowflake = Snowflake;

const ALERT_TYPES: { id: AlertType; label: string; icon: any; description: string }[] = [
  { id: 'heavy_rain', label: 'أمطار غزيرة', icon: CloudRain, description: 'تنبيه عند هطول أمطار غزيرة أو سيول' },
  { id: 'storm', label: 'عواصف رعدية', icon: CloudLightning, description: 'تحذير من صواعق وعواصف قوية' },
  { id: 'extreme_heat', label: 'حرارة شديدة', icon: Sun, description: 'تنبيه عندما تتجاوز الحرارة ٤٠ درجة' },
  { id: 'frost', label: 'صقيع وبرودة', icon: snowflake, description: 'تنبيه عندما تنخفض الحرارة عن الصفر' },
  { id: 'high_waves', label: 'أمواج البحر', icon: Waves, description: 'تنبيه عندما يتجاوز ارتفاع الموج ٢ متر' },
  { id: 'soil_saturation', label: 'تشبع التربة', icon: Shrub, description: 'تنبيه عند تشبع التربة لتجنب مخاطر الانزلاقات' },
  { id: 'forest_fire_risk', label: 'حرائق الغابات', icon: Trees, description: 'تنبيه عند ارتفاع خطر الحرائق في الغابات' },
];

export default function App() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [location, setLocation] = useState<LocationInfo>({
    name: 'دبي',
    country: 'الإمارات العربية المتحدة',
    latitude: 25.2048,
    longitude: 55.2708,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationInfo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  
  // Alert States
  const [alerts, setAlerts] = useState<AlertConfig[]>(() => {
    const saved = localStorage.getItem('sahab_alerts');
    return saved ? JSON.parse(saved) : [];
  });
  const [showAlertSettings, setShowAlertSettings] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState<{ id: string; message: string; type: AlertType }[]>([]);
  const [isAddingAlert, setIsAddingAlert] = useState(false);
  const [news, setNews] = useState<string[]>([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [fishingSpots, setFishingSpots] = useState<string[]>([]);
  const [loadingFishing, setLoadingFishing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showObservatoryModal, setShowObservatoryModal] = useState(false);
  const [observatoryReports, setObservatoryReports] = useState<{ id: string; message: string; timestamp: string; location: string }[]>(() => {
    const saved = localStorage.getItem('sahab_observatory');
    return saved ? JSON.parse(saved) : [];
  });
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [recentLocations, setRecentLocations] = useState<LocationInfo[]>(() => {
    const saved = localStorage.getItem('sahab_recent');
    return saved ? JSON.parse(saved) : [];
  });

  const loadData = useCallback(async (loc: LocationInfo) => {
    setLoading(true);
    try {
      const data = await fetchWeather(loc.latitude, loc.longitude);
      setWeather(data);
      setLocation(loc);
      setAiInsight(null);
      
      // Get AI insight
      setLoadingInsight(true);
      const insight = await getDetailedWeatherInsight(data, loc.name, loc.elevation);
      setAiInsight(insight);
      setLoadingInsight(false);
      
      // Get Weather News
      setLoadingNews(true);
      const weatherNews = await getWeatherNews(data, loc.name);
      setNews(weatherNews);
      setLoadingNews(false);
      
      // Get Fishing Hotspots
      setLoadingFishing(true);
      const spots = await getFishingHotspots(loc.name, data);
      setFishingSpots(spots);
      setLoadingFishing(false);
      
      // Update recent locations
      setRecentLocations(prev => {
        const filtered = prev.filter(p => p.name !== loc.name).slice(0, 4);
        const updated = [loc, ...filtered];
        localStorage.setItem('sahab_recent', JSON.stringify(updated));
        return updated;
      });
      
      // Check for alerts for THIS location immediately
      checkLocalAlerts(data, loc);
    } catch (error) {
      console.error('Failed to fetch weather:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkLocalAlerts = (data: WeatherData, loc: LocationInfo) => {
    const matched: { id: string; message: string; type: AlertType }[] = [];
    
    // Check against all saved alert configs that match this location (or any location if enabled)
    alerts.forEach(config => {
      // For simplicity, we check if location is roughly the same or if it's the specific pinned location
      const isSameLoc = Math.abs(config.location.latitude - loc.latitude) < 0.1 && 
                         Math.abs(config.location.longitude - loc.longitude) < 0.1;
      
      if (config.enabled && isSameLoc) {
        config.types.forEach(type => {
          if (type === 'heavy_rain' && (data.current.weatherCode === 65 || data.current.weatherCode === 82)) {
            matched.push({ id: `alert-${type}`, message: `تحذير من أمطار غزيرة جداً في ${loc.name}`, type });
          }
          if (type === 'storm' && data.current.weatherCode >= 95) {
            matched.push({ id: `alert-${type}`, message: `رصد عواصف رعدية نشطة في ${loc.name}`, type });
          }
          if (type === 'extreme_heat' && data.current.temp >= 40) {
            matched.push({ id: `alert-${type}`, message: `موجة حر شديدة تتجاوز ٤٠ درجة في ${loc.name}`, type });
          }
          if (type === 'frost' && data.current.temp <= 0) {
            matched.push({ id: `alert-${type}`, message: `تحذير من تشكل الصقيع في ${loc.name}`, type });
          }
          if (type === 'high_waves' && data.current.waveHeight && data.current.waveHeight >= 2) {
            matched.push({ id: `alert-${type}`, message: `تحذير من أمواج عالية في مدينتك (${data.current.waveHeight}م)`, type });
          }
          if (type === 'soil_saturation' && data.current.soilMoisture && data.current.soilMoisture >= 0.35) {
            matched.push({ id: `alert-${type}`, message: `تحذير: التربة مشبعة جداً بالمياه في ${loc.name}. خطر انزلاقات!`, type });
          }
          if (type === 'forest_fire_risk' && data.current.temp >= 35 && data.current.humidity <= 20) {
            matched.push({ id: `alert-${type}`, message: `تحذير: خطر مرتفع لنشوب حرائق غابات في ${loc.name} بسبب الجفاف والحرارة.`, type });
          }
        });
      }
    });

    if (matched.length > 0) {
      setActiveAlerts(prev => {
        const unique = [...prev];
        matched.forEach(m => {
          if (!unique.find(u => u.id === m.id)) unique.push(m);
        });
        return unique;
      });
    }
  };

  useEffect(() => {
    loadData(location);
  }, []);

  useEffect(() => {
    localStorage.setItem('sahab_alerts', JSON.stringify(alerts));
  }, [alerts]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    const results = await searchLocation(searchQuery);
    setSearchResults(results);
    setIsSearching(false);
  };

  const selectLocation = (loc: LocationInfo) => {
    setSearchResults([]);
    setSearchQuery('');
    if (isAddingAlert) {
      // If we are in "Adding Alert" mode, we don't switch view, we just create a new alert config
      const newAlert: AlertConfig = {
        id: Math.random().toString(36).substr(2, 9),
        location: loc,
        types: [],
        enabled: true,
      };
      setAlerts([...alerts, newAlert]);
      setIsAddingAlert(false);
    } else {
      loadData(loc);
    }
  };

  const toggleAlertType = (configId: string, type: AlertType) => {
    setAlerts(prev => prev.map(a => {
      if (a.id === configId) {
        const types = a.types.includes(type) 
          ? a.types.filter(t => t !== type) 
          : [...a.types, type];
        return { ...a, types };
      }
      return a;
    }));
  };

  const removeAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const shareWeather = async () => {
    if (!weather) return;
    const text = `تحقق من حالة الطقس في ${location.name} عبر تطبيق سحاب: ${weather.current.temp}°C و ${WEATHER_CODES[weather.current.weatherCode]?.label}. #سحاب #طقس`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'سحاب للطقس',
          text: text,
          url: window.location.href,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      // Fallback copy to clipboard
      navigator.clipboard.writeText(text);
      alert('تم نسخ تفاصيل الطقس للمشاركة!');
    }
  };

  const sendObservatoryAlert = async () => {
    if (!broadcastMessage.trim()) return;
    setIsBroadcasting(true);
    try {
      const alertText = await broadcastObservatoryAlert(broadcastMessage, location.name);
      const newReport = {
        id: Math.random().toString(36).substr(2, 9),
        message: alertText,
        timestamp: new Date().toLocaleTimeString('ar-EG'),
        location: location.name
      };
      const updatedReports = [newReport, ...observatoryReports].slice(0, 5);
      setObservatoryReports(updatedReports);
      localStorage.setItem('sahab_observatory', JSON.stringify(updatedReports));
      setBroadcastMessage('');
      setShowObservatoryModal(false);
    } catch (error) {
      console.error("Broadcast failed:", error);
    } finally {
      setIsBroadcasting(false);
    }
  };

  const useCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        loadData({
          name: 'موقعك الحالي',
          country: '',
          latitude,
          longitude,
        });
      });
    }
  };

  const currentIconName = weather ? WEATHER_CODES[weather.current.weatherCode]?.icon : 'Sun';
  const WeatherIcon = ICON_MAP[currentIconName] || Sun;

  const getNatureStatus = () => {
    if (!weather || !location) return null;
    const isForest = location.featureCode === 'FRST' || (weather.current.soilMoisture && weather.current.soilMoisture > 0.25 && weather.current.humidity > 40);
    const isLake = location.featureCode === 'LK' || location.featureCode === 'LKI' || location.name.includes('بحيرة') || location.name.includes('Lake');
    const isGreen = weather.current.soilMoisture && weather.current.soilMoisture > 0.2;
    
    if (isLake) return { label: 'منطقة بحيرات', icon: Fish, color: 'text-blue-400', bg: 'bg-blue-400/10' };
    if (isForest) return { label: 'منطقة غابات كثيفة', icon: Trees, color: 'text-emerald-400', bg: 'bg-emerald-400/10' };
    if (isGreen) return { label: 'منطقة خضراء زراعية', icon: Shrub, color: 'text-lime-400', bg: 'bg-lime-400/10' };
    return { label: 'منطقة جافة/صحراوية', icon: Tent, color: 'text-amber-400', bg: 'bg-amber-400/10' };
  };

  const natureStatus = getNatureStatus();

  const getGradient = () => {
    if (!weather) return 'from-sky-400 to-blue-600';
    if (!weather.current.isDay) return 'from-indigo-900 to-slate-900';
    if (weather.current.weatherCode >= 60) return 'from-slate-400 to-slate-600';
    if (weather.current.weatherCode > 0) return 'from-sky-300 to-blue-400';
    return 'from-orange-400 to-sky-400';
  };

  return (
    <div className={cn(
      "min-h-screen transition-all duration-1000 p-4 md:p-8 flex flex-col items-center justify-start gap-8 font-sans bg-gradient-to-br",
      getGradient()
    )} dir="rtl">
      
      {/* Observatory Alert Modal */}
      <AnimatePresence>
        {showObservatoryModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowObservatoryModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-sky-500/30 rounded-[2.5rem] shadow-[0_0_50px_rgba(14,165,233,0.2)] overflow-hidden"
            >
              <div className="p-8 border-b border-white/10 bg-sky-500/5">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-sky-500/20 text-sky-400 animate-pulse">
                    <Radio size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white">تنبيه المراصد العالمية</h3>
                    <p className="text-xs text-sky-300/50 uppercase tracking-widest">Global Observatory Network v2.0</p>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <label className="text-sm font-bold text-white/60 mr-1 italic">صف الحدث الجوي الذي تشاهده:</label>
                  <textarea 
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    placeholder="مثال: عاصفة غبار كثيفة قادمة من الشمال..."
                    className="w-full h-32 p-4 rounded-2xl bg-black/40 border border-white/10 text-white placeholder:text-white/20 focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 outline-none transition-all resize-none"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex gap-3 items-start">
                  <ShieldAlert size={18} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-200/70 leading-relaxed">
                    سيتم معالجة بلاغك بواسطة الذكاء الاصطناعي "سحاب" وتحويله إلى صيغة مرصدية احترافية وإرساله إلى شبكة المراصد العالمية. يرجى تحري الدقة.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowObservatoryModal(false)}
                    className="flex-1 p-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white transition-all font-bold"
                  >
                    إلغاء
                  </button>
                  <button 
                    onClick={sendObservatoryAlert}
                    disabled={isBroadcasting || !broadcastMessage.trim()}
                    className="flex-3 p-4 rounded-2xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all font-black flex items-center justify-center gap-2"
                  >
                    {isBroadcasting ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                    <span>بث التنبيه للمراصد</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Active Alerts Overlay */}
      <AnimatePresence>
        {showMenu && (
          <div className="fixed inset-0 z-[150] flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMenu(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100vw' }}
              animate={{ x: 0 }}
              exit={{ x: '100vw' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-80 max-w-[85vw] h-full bg-slate-900 border-l border-white/10 shadow-2xl flex flex-col p-6 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
                    <Sparkles size={20} />
                  </div>
                  <h2 className="text-xl font-black text-white tracking-widest uppercase">سحاب</h2>
                </div>
                <button onClick={() => setShowMenu(false)} className="p-2 rounded-xl hover:bg-white/10 text-white/60">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-8">
                {/* Navigation Links */}
                <div className="space-y-1">
                  <button 
                    onClick={() => { setShowMenu(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 text-sky-400 border border-sky-400/20 font-bold"
                  >
                    <Home size={20} />
                    <span>الرئيسية</span>
                  </button>
                  <button 
                    onClick={() => { setShowMenu(false); setShowAlertSettings(true); }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl text-white/70 hover:bg-white/5 transition-colors"
                  >
                    <Bell size={20} />
                    <span>إعدادات التنبيهات</span>
                    {alerts.length > 0 && <span className="mr-auto bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full">{alerts.length}</span>}
                  </button>
                  <button 
                    onClick={() => { setShowMenu(false); document.getElementById('news-section')?.scrollIntoView({ behavior: 'smooth' }); }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl text-white/70 hover:bg-white/5 transition-colors"
                  >
                    <Newspaper size={20} />
                    <span>نشرة الأخبار</span>
                  </button>
                  <button 
                    onClick={() => { setShowMenu(false); document.getElementById('fishing-radar')?.scrollIntoView({ behavior: 'smooth' }); }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl text-white/70 hover:bg-white/5 transition-colors"
                  >
                    <Fish size={20} />
                    <span>رادار الأسماك</span>
                  </button>
                  <button 
                    onClick={() => { setShowMenu(false); setShowObservatoryModal(true); }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl text-white/70 hover:bg-white/5 transition-colors"
                  >
                    <Tower size={20} />
                    <span>تنبيه المراصد العالمية</span>
                  </button>
                </div>

                {/* Recent Searches */}
                <div>
                  <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-4 mr-2">المواقع الأخيرة</h3>
                  <div className="space-y-2">
                    {recentLocations.map((loc, i) => (
                      <button
                        key={i}
                        onClick={() => { setShowMenu(false); loadData(loc); }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-white/60 group transition-all"
                      >
                        <History size={16} className="group-hover:text-sky-400" />
                        <span className="text-sm truncate">{loc.name}</span>
                        <ChevronRight size={14} className="mr-auto opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                      </button>
                    ))}
                    {recentLocations.length === 0 && <p className="text-xs text-white/20 italic mr-2">لا توجد مواقع محفوظة بعد.</p>}
                  </div>
                </div>

                {/* Smart Recommendations */}
                <div className="p-5 rounded-[2rem] bg-indigo-500/10 border border-indigo-500/20">
                  <div className="flex items-center gap-2 mb-3 text-indigo-400">
                    <Sparkles size={16} />
                    <span className="text-[10px] font-bold uppercase">نصيحة ذكية</span>
                  </div>
                  <p className="text-xs text-white/60 leading-relaxed italic">
                    {weather?.current.temp && weather.current.temp > 30 ? "الطقس حار اليوم، تذكر شرب الكثير من الماء وضبط تنبيهات الحرارة." : "الظروف الجوية مستقرة حالياً، استمتع بيومك!"}
                  </p>
                </div>
              </div>

              <div className="mt-auto pt-6 border-t border-white/5">
                <button className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-white/5 text-white/40 text-xs hover:text-white transition-colors">
                  <Settings2 size={14} />
                  <span>إعدادات التطبيق</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Active Alerts Overlay */}
      <div className="fixed top-4 left-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {activeAlerts.map((alert) => (
            <motion.div
              key={alert.id}
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              className="pointer-events-auto w-full md:w-auto self-end bg-red-600/90 backdrop-blur-xl border border-white/20 p-4 rounded-2xl shadow-2xl text-white flex items-center justify-between gap-4 max-w-md"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle size={24} className="animate-pulse" />
                <p className="font-bold text-sm leading-tight">{alert.message}</p>
              </div>
              <button 
                onClick={() => setActiveAlerts(prev => prev.filter(a => a.id !== alert.id))}
                className="p-1 hover:bg-white/20 rounded-full"
              >
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header & Search */}
      <div className="w-full max-w-2xl flex flex-col gap-4 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowMenu(true)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10"
              title="القائمة"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-3xl font-black text-white drop-shadow-md tracking-tighter">سحاب</h1>
            <div className="h-6 w-[1px] bg-white/20 mx-1" />
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              مباشر الآن
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowAlertSettings(true)}
              className="relative p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10"
              title="التنبيهات"
            >
              <Bell size={20} className={alerts.length > 0 ? "text-orange-400 animate-bounce" : ""} />
              {alerts.length > 0 && (
                <span className="absolute -top-1 -left-1 w-4 h-4 bg-orange-600 text-white text-[8px] flex items-center justify-center rounded-full border border-slate-900 font-bold">
                  {alerts.length}
                </span>
              )}
            </button>
            <button 
              onClick={useCurrentLocation}
              className="group/gps flex items-center gap-2 pr-2 pl-4 py-2 rounded-xl bg-white/20 backdrop-blur-md hover:bg-white/30 transition-all text-white border border-white/10"
              title="استخدم موقعي GPS"
            >
              <Navigation size={20} className="group-hover/gps:rotate-12 transition-transform" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSearch} className="relative group">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAddingAlert ? "ابحث عن مدينة لإضافتها للتنبيهات..." : "ابحث عن مدينة..."}
            className={cn(
              "w-full p-4 pr-12 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 text-white placeholder:text-white/60 outline-none focus:ring-2 focus:ring-white/50 transition-all shadow-inner",
              isAddingAlert && "ring-2 ring-emerald-400"
            )}
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70" size={20} />
          {isSearching && (
            <Loader2 className="absolute left-10 top-1/2 -translate-y-1/2 animate-spin text-white/70" size={20} />
          )}
          
          <AnimatePresence>
            {searchResults.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full mt-2 w-full bg-white/90 backdrop-blur-2xl rounded-2xl border border-white/20 shadow-2xl overflow-hidden z-50 text-slate-800"
              >
                {searchResults.map((res, i) => (
                  <button
                    key={`${res.latitude}-${i}`}
                    onClick={() => selectLocation(res)}
                    className="w-full p-4 flex flex-col items-start hover:bg-sky-50 transition-colors border-b last:border-b-0 border-slate-100"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex flex-col items-start">
                        <span className="font-bold">{res.name}</span>
                        <span className="text-sm text-slate-500">{res.country}</span>
                      </div>
                      {isAddingAlert && <Plus size={20} className="text-emerald-600" />}
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </form>
        {isAddingAlert && (
          <button 
            onClick={() => setIsAddingAlert(false)}
            className="text-xs text-white/70 hover:text-white underline self-center"
          >
            إلغاء إضافة تنبيه
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <Loader2 className="animate-spin text-white" size={60} />
          <p className="text-white/80 animate-pulse text-lg">جاري تحميل الطقس...</p>
        </div>
      ) : weather && (
        <motion.main 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-6 pb-12"
        >
          {/* Main Weather Hero */}
          <div className="md:col-span-12 lg:col-span-8 p-8 rounded-[2rem] bg-white/20 backdrop-blur-2xl border border-white/30 text-white flex flex-col md:flex-row items-center md:items-start justify-between relative overflow-hidden shadow-2xl">
            <div className="z-10 text-center md:text-right">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2 bg-white/10 w-fit px-4 py-1 rounded-full mx-auto md:mx-0">
                <MapPin size={16} />
                <span className="text-sm font-medium">{location.name}</span>
                {location.elevation !== undefined && (
                  <>
                    <div className="h-3 w-[1px] bg-white/20 mx-1" />
                    <div className="flex items-center gap-1 opacity-80">
                      <Mountain size={14} />
                      <span className="text-xs">{location.elevation}م</span>
                      <span className="text-[10px]">{location.elevation > 500 ? '(منطقة عالية)' : '(منطقة منخفضة)'}</span>
                    </div>
                  </>
                )}
              </div>
              <h2 className="text-8xl md:text-9xl font-black drop-shadow-xl mb-2 flex items-start">
                {Math.round(weather.current.temp)}
                <span className="text-4xl md:text-5xl font-light mt-4 ml-1">°</span>
              </h2>
              <p className="text-2xl md:text-3xl font-medium text-white/90 mb-6 drop-shadow-md">
                {WEATHER_CODES[weather.current.weatherCode]?.label}
              </p>
              
              <div className="flex gap-6 justify-center md:justify-start">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-white/10">
                    <Droplets size={20} className="text-sky-200" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-white/60">رطوبة</span>
                    <span className="font-bold">{weather.current.humidity}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-white/10">
                    <Wind size={20} className="text-emerald-200" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-white/60">رياح</span>
                    <span className="font-bold">{weather.current.windSpeed} كم/س</span>
                  </div>
                </div>
                {weather.current.waveHeight !== undefined && (
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-white/10">
                      <Waves size={20} className="text-indigo-200" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-white/60">أمواج</span>
                      <span className="font-bold">{weather.current.waveHeight}م</span>
                    </div>
                  </div>
                )}
                {weather.current.soilMoisture !== undefined && (
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-white/10">
                      <Sprout size={20} className={cn(
                        "transition-colors",
                        weather.current.soilMoisture > 0.35 ? "text-blue-300" : "text-amber-200"
                      )} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-white/60">رطوبة التربة</span>
                      <span className="font-bold">
                        {weather.current.soilMoisture > 0.35 ? 'مشبعة' : weather.current.soilMoisture < 0.1 ? 'جافة' : 'مثالية'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <motion.div 
              animate={{ 
                y: [0, -10, 0],
                rotate: [0, 2, 0]
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity,
                ease: "easeInOut" 
              }}
              className="mt-8 md:mt-0 z-10"
            >
              <WeatherIcon size={180} strokeWidth={1} className="drop-shadow-[0_0_30px_rgba(255,255,255,0.4)]" />
            </motion.div>

            {/* Share Button */}
            <button 
              onClick={shareWeather}
              className="absolute bottom-6 left-6 p-3 rounded-2xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 text-white flex items-center gap-2 text-sm font-medium z-10"
            >
              <Share2 size={18} />
              <span>أخبر أصدقاءك</span>
            </button>

            {/* Subtle background glow */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/20 rounded-full blur-[100px]" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-white/10 rounded-full blur-[80px]" />
          </div>

          {/* Nature & Environmental Sections */}
          <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Fishing Radar Section */}
            <div id="fishing-radar" className="p-8 rounded-[2rem] bg-sky-900/40 backdrop-blur-2xl border border-white/10 text-white relative overflow-hidden group shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400">
                    <Radar size={24} className="animate-spin-slow" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">رادار الأسماك GPS</h3>
                    <p className="text-xs text-white/40">أفضل مواقع الصيد المحيطة بك</p>
                  </div>
                </div>
                <Anchor size={24} className="text-white/20 group-hover:rotate-12 transition-transform" />
              </div>

              <div className="space-y-4">
                {loadingFishing ? (
                  Array(3).fill(0).map((_, i) => (
                    <div key={i} className="h-14 bg-white/5 rounded-2xl animate-pulse" />
                  ))
                ) : fishingSpots.length > 0 ? (
                  fishingSpots.map((spot, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3 group hover:bg-white/10 transition-all"
                    >
                      <div className="w-8 h-8 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
                        <Fish size={14} />
                      </div>
                      <span className="text-sm font-medium">{spot}</span>
                    </motion.div>
                  ))
                ) : (
                  <p className="text-center text-white/40 py-4 italic">لا تتوفر بيانات صيد لهذا الموقع.</p>
                )}
              </div>

              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Waves size={100} />
              </div>
            </div>

            {/* Existing Nature Status (Moved inside this grid) */}
            {natureStatus && (
              <div className={cn("p-8 rounded-[2rem] backdrop-blur-2xl border border-white/10 flex flex-col justify-between shadow-xl relative overflow-hidden", natureStatus.bg)}>
                <div className="flex items-center gap-4">
                  <div className={cn("p-4 rounded-2xl bg-white/10", natureStatus.color)}>
                    <natureStatus.icon size={40} />
                  </div>
                  <div>
                    <h4 className="text-white/60 text-xs font-bold uppercase tracking-tighter mb-1">البيئة المحيطة</h4>
                    <p className={cn("text-2xl font-black", natureStatus.color)}>{natureStatus.label}</p>
                  </div>
                </div>
                <p className="text-white/40 text-xs leading-relaxed mt-4">
                  تم تحليل هذا التصنيف بناءً على الإحداثيات الجغرافية، ارتفاع المنطقة عن سطح البحر، ورطوبة التربة المباشرة من القمر الصناعي.
                </p>
                <div className="absolute -bottom-10 -right-10 opacity-10 blur-xl">
                  <natureStatus.icon size={150} />
                </div>
              </div>
            )}
          </div>

          {/* AI Insight Box (Removed original lone Insight and nature card to fit the new layout) */}
          <div className="md:col-span-12 p-8 rounded-[2rem] bg-indigo-950/40 backdrop-blur-2xl border border-white/20 text-white flex flex-col justify-center relative overflow-hidden group shadow-xl">
            <div className="flex items-center gap-2 mb-4 text-emerald-400">
              <Sparkles size={20} />
              <span className="text-xs font-bold uppercase tracking-widest">رؤية سحاب الذكية</span>
            </div>
            
            {loadingInsight ? (
              <div className="flex flex-col gap-2">
                <div className="h-4 bg-white/10 rounded w-full animate-pulse" />
                <div className="h-4 bg-white/10 rounded w-3/4 animate-pulse" />
                <div className="h-4 bg-white/10 rounded w-1/2 animate-pulse" />
              </div>
            ) : (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-lg leading-relaxed font-medium italic"
              >
                "{aiInsight}"
              </motion.p>
            )}

            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Sparkles size={80} />
            </div>
          </div>

          {/* 5-Day Forecast */}
          <div className="md:col-span-12 overflow-x-auto pb-4 scrollbar-hide">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <ArrowDownCircle size={18} className="text-sky-300" />
              <span>توقعات الأيام القادمة</span>
            </h3>
            <div className="flex gap-4 min-w-max">
              {weather.daily.time.map((day, i) => {
                const date = new Date(day);
                const dayName = date.toLocaleDateString('ar-EG', { weekday: 'long' });
                const iconName = WEATHER_CODES[weather.daily.weatherCode[i]]?.icon;
                const DailyIcon = ICON_MAP[iconName] || Sun;

                return (
                  <motion.div
                    key={day}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="w-36 p-6 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 flex flex-col items-center justify-between gap-4 text-white hover:bg-white/20 transition-all cursor-default"
                  >
                    <span className="text-sm font-medium text-white/70">{dayName}</span>
                    <DailyIcon size={40} className="drop-shadow-md text-white" strokeWidth={1.5} />
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-1">
                        <ArrowUpCircle size={12} className="text-orange-300" />
                        <span className="font-bold">{Math.round(weather.daily.tempMax[i])}°</span>
                      </div>
                      <div className="flex items-center gap-1 text-white/60">
                        <ArrowDownCircle size={12} className="text-sky-200" />
                        <span className="text-sm">{Math.round(weather.daily.tempMin[i])}°</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* News & Public Alerts Section */}
          <div id="news-section" className="md:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Local News Feed */}
            <div className="lg:col-span-8 p-8 rounded-[2rem] bg-black/30 backdrop-blur-2xl border border-white/10 text-white">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400">
                    <Newspaper size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">نشرة أخبار سحاب</h3>
                    <p className="text-xs text-white/40">آخر التحديثات والتحذيرات العامة</p>
                  </div>
                </div>
                <Megaphone size={24} className="text-white/20 animate-bounce" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loadingNews ? (
                  Array(3).fill(0).map((_, i) => (
                    <div key={i} className="h-24 bg-white/5 rounded-2xl animate-pulse" />
                  ))
                ) : news.length > 0 ? (
                  news.map((item, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors flex flex-col gap-3 group"
                    >
                      <div className="flex items-center gap-2 text-orange-400 text-[10px] font-bold uppercase">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping" />
                        عاجل
                      </div>
                      <p className="text-sm font-medium leading-relaxed group-hover:text-sky-300 transition-colors">
                        {item}
                      </p>
                    </motion.div>
                  ))
                ) : (
                  <p className="col-span-full text-center text-white/40 py-8 italic">لا توجد أخبار عاجلة حالياً.</p>
                )}
              </div>
            </div>

            {/* Global Observatory Feed */}
            <div className="lg:col-span-4 p-8 rounded-[2rem] bg-sky-950/20 backdrop-blur-2xl border border-sky-500/10 text-white flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Globe2 size={20} className="text-sky-400" />
                  <h3 className="text-lg font-bold tracking-tight">شبكة المراصد</h3>
                </div>
                <button 
                  onClick={() => setShowObservatoryModal(true)}
                  className="px-3 py-1 rounded-full bg-sky-500/20 text-sky-400 text-[8px] font-black uppercase border border-sky-500/20 hover:bg-sky-500 hover:text-white transition-all shadow-lg shadow-sky-500/10"
                >
                  إبلاغ المرصد
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto max-h-[300px] scrollbar-hide pr-1">
                {observatoryReports.length > 0 ? (
                  observatoryReports.map((report) => (
                    <motion.div 
                      key={report.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-2xl bg-white/5 border-r-2 border-r-sky-500 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest">{report.location}</span>
                        <span className="text-[10px] text-white/30 font-mono">{report.timestamp}</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-white/80 font-medium">
                        {report.message}
                      </p>
                    </motion.div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full opacity-20 text-center gap-4 py-10">
                    <Tower size={40} />
                    <p className="text-xs italic">لا توجد بلاغات مرصدية نشطة حالياً</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.main>
      )}

      {/* Alert Settings Modal */}
      <AnimatePresence>
        {showAlertSettings && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAlertSettings(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-orange-500/20 text-orange-400">
                    <Bell size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">إعدادات التنبيهات</h3>
                    <p className="text-xs text-white/50">اختر الظروف الجوية والمواقع التي تهمك</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAlertSettings(false)}
                  className="p-2 rounded-full hover:bg-white/10 text-white/60"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
                {alerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-white/20">
                      <Bell size={40} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-white font-medium">لا توجد تنبيهات نشطة</p>
                      <p className="text-white/40 text-sm max-w-xs">أضف مدينة والظروف الجوية التي تريد تلقي تحذيرات بشأنها</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {alerts.map((config) => (
                      <div key={config.id} className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MapPin size={18} className="text-sky-400" />
                            <span className="font-bold text-white uppercase tracking-wider">{config.location.name}</span>
                          </div>
                          <button 
                            onClick={() => removeAlert(config.id)}
                            className="p-2 text-red-400/60 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {ALERT_TYPES.map((type) => {
                            const isSelected = config.types.includes(type.id);
                            const TypeIcon = type.icon;
                            return (
                              <button
                                key={type.id}
                                onClick={() => toggleAlertType(config.id, type.id)}
                                className={cn(
                                  "flex items-center gap-4 p-4 rounded-2xl border transition-all text-right",
                                  isSelected 
                                    ? "bg-white/15 border-white/30 text-white shadow-lg" 
                                    : "bg-white/[0.02] border-white/5 text-white/50 hover:bg-white/[0.05]"
                                )}
                              >
                                <div className={cn(
                                  "p-2 rounded-xl",
                                  isSelected ? "bg-orange-500/20 text-orange-400" : "bg-white/5 text-white/30"
                                )}>
                                  <TypeIcon size={20} />
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-bold text-sm">{type.label}</span>
                                  <span className="text-[10px] opacity-60 leading-tight">{type.description}</span>
                                </div>
                                {isSelected && <CheckCircle2 size={16} className="mr-auto text-emerald-400" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-6 bg-white/[0.02] border-t border-white/10 flex flex-col gap-4">
                <button 
                  onClick={() => {
                    setIsAddingAlert(true);
                    setShowAlertSettings(false);
                  }}
                  className="w-full p-4 rounded-2xl bg-white text-slate-900 font-bold flex items-center justify-center gap-2 hover:bg-sky-50 transition-all shadow-xl"
                >
                  <Plus size={20} />
                  إضافة موقع جديد للتنبيهات
                </button>
                <p className="text-[10px] text-center text-white/30">
                  * يتم فحص التنبيهات تلقائياً عند فتح التطبيق للمواقع المضافة.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="mt-auto py-8 text-white/40 text-xs flex flex-col items-center gap-2">
        <p>© ٢٠٢٦ سحاب للطقس • مدعوم بالذكاء الاصطناعي</p>
        <div className="flex gap-4 uppercase tracking-[0.2em]">
          <span>Open-Meteo</span>
          <span>Gemini AI</span>
        </div>
      </footer>
    </div>
  );
}
