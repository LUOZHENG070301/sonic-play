/**
 * Sonic Play - Duolingo 风格音乐创作应用
 * 包含录音、音轨、编辑、导出四个标签页
 * 整合五线谱编辑器、音轨编辑器和 AI 面板功能
 */
import React, { useEffect, useRef, useState, lazy, Suspense } from 'react';
import {
  Mic,
  Music,
  Share2,
  Settings,
  Play,
  Plus,
  Undo,
  Redo,
  Sparkles,
  Disc,
  Check,
  Keyboard,
  Upload,
  ArrowLeft,
  Smartphone,
  Edit2,
  Trash2,
  Volume2,
  Timer,
  Save,
  Pause,
  X,
  Languages,
  RotateCcw,
  CheckCircle2,
  Headphones,
  Square,
  Crown,
  Coins,
  Bell,
  Zap,
  Store,
  Waves,
  FileMusic,
  LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useProjectStore } from '@/stores/projectStore';
import { useAuthStore } from '@/stores/authStore';
import { useAutoSave } from '@/hooks/useRealtime';
import AuthModal from '@/components/AuthModal';

// 懒加载功能模块
const StaffEditor = lazy(() => import('@/features/staff-editor/StaffEditor'));
const TrackEditor = lazy(() => import('@/features/track-editor/TrackEditor'));
const AIPanel = lazy(() => import('@/features/ai-panel/AIPanel'));

// --- Types ---

type AppTab = 'record' | 'tracks' | 'edit' | 'export';
type Language = 'zh' | 'en';
type EditorView = 'staff' | 'waveform' | 'main';

interface Instrument {
  id: string;
  nameKey: string;
  icon: React.ReactNode;
}

interface Track {
  id: string;
  title: string;
  genre: string;
  bpm: number;
  duration: string;
  progress: number;
}

interface Segment {
  id: string;
  type: 'original' | 'ai' | 'harmony';
  start: number; // percentage
  width: number; // percentage
  trackIndex: number;
}

// --- Translations ---

const translations = {
  zh: {
    appName: 'Sonic Play',
    record: '录音',
    tracks: '音轨',
    edit: '编辑',
    export: '导出',
    whatPlaying: '我们要演奏什么？',
    describeVibe: '描述一下创作氛围... (如: 快乐爵士)',
    chooseInst: '选个乐器，开始你的音乐冒险！',
    startRecord: '开始录制',
    stopRecord: '停止',
    import: '导入',
    mixing: '当前混音',
    aiRec: 'AI 创意加油站',
    recTitle1: '注入 Lo-Fi 灵感',
    recDesc1: '由 AI 生成的复古节拍，让旋律更稳。',
    recTitle2: '建议一段过渡',
    recDesc2: 'AI 帮你创作桥段，迎接高潮。',
    history: '创作历史',
    newWork: '加入新作品',
    creating: '正在打磨...',
    savePrompt: '保存到灵感库？',
    save: '确认保存',
    discard: '不保存',
    undo: '撤销',
    redo: '重做',
    addBg: '添加背景轨道',
    advanceTitle: '高级创作园地',
    staffViz: '灵感谱可视化',
    jazz: '爵士化混刻',
    quantize: '节奏修整',
    harmony: '和弦增强',
    addBgMusic: '添加伴奏',
    greatJob: '干得漂亮！',
    readyMsg: '音乐已就绪！AI 已为你优化音质。',
    exportShare: '分享到朋友圈',
    saveLoop: '保存为 Loop',
    sharePrompt: '先选一个心仪的作品吧',
    loopPrompt: '完美创作！我们要？',
    directShare: '导出并分享',
    saveToHistory: '存入创作历史',
    sharing: '正在分享...',
    saving: '灵感保存中...',
    profile: '艺术家资料',
    userName: '音乐人',
    userId: '唯一身份码',
    appleId: '通过 Apple 登录',
    uploadAvatar: '选取头像',
    settings: '偏好设置',
    fontSize: '文字大小',
    darkMode: '深色模式',
    language: '语言',
    close: '关闭',
    saveChanges: '保存更改',
    level: '创作等级',
    gems: '音符币',
    pro: '专业版',
    notifications: '动态',
    shop: '商店',
    upgradePro: '升级专业版',
    premiumFeatures: '解锁无限音轨与高级音色',
    buyGems: '获取音符币',
    exitApp: '退出应用',
    instrument: {
      piano: '钢琴',
      guitar: '吉他',
      violin: '小提琴',
      drums: '鼓组'
    },
    segment: '片段',
    aiSuggestTitle: '的 AI 修改建议',
    selectFileMsg: '从手机导入音频',
    saveToEdit: '确定并返回',
    confirmToEdit: '进入编辑',
    streak: '连胜',
    xp: '经验值',
    dailyGoal: '每日目标',
    minutes: '分钟',
    staffEditor: '五线谱',
    trackEditor: '音轨编辑',
    aiAssistant: 'AI 助手'
  },
  en: {
    appName: 'Sonic Play',
    record: 'Capture',
    tracks: 'Studio',
    edit: 'Refine',
    export: 'Share',
    whatPlaying: "What's the vibe?",
    describeVibe: 'Describe your vibe... (e.g., Chill Jazz)',
    chooseInst: 'Pick an instrument and let it rip!',
    startRecord: 'Record',
    stopRecord: 'Stop',
    import: 'Import',
    mixing: 'Studio Mix',
    aiRec: 'AI Boosts',
    recTitle1: 'Add Lo-Fi Grit',
    recDesc1: 'Inject AI-powered vintage beats.',
    recTitle2: 'Suggest a Bridge',
    recDesc2: 'AI creates tension for the finale.',
    history: 'My Works',
    newWork: 'New Session',
    creating: 'Polishing...',
    savePrompt: 'Save this spark?',
    save: 'Save It',
    discard: 'Discard',
    undo: 'Undo',
    redo: 'Redo',
    addBg: 'Add Track',
    advanceTitle: 'Advanced Studio',
    staffViz: 'Melody Visualizer',
    jazz: 'Jazzize Mix',
    quantize: 'Tighten Beat',
    harmony: 'Rich Harmony',
    addBgMusic: 'Add Background',
    greatJob: 'Incredible!',
    readyMsg: 'Your track is ready. AI has optimized the output.',
    exportShare: 'Share Everywhere',
    saveLoop: 'Save Loop',
    sharePrompt: 'Select a track to share',
    loopPrompt: 'Session Complete! Next?',
    directShare: 'Export & Share',
    saveToHistory: 'Save to Studio',
    sharing: 'Sharing...',
    saving: 'Saving...',
    profile: 'Artist Profile',
    userName: 'Artist Name',
    userId: 'Unique ID',
    appleId: 'Sign in with Apple',
    uploadAvatar: 'Upload Avatar',
    settings: 'Settings',
    fontSize: 'Text Size',
    darkMode: 'Dark Mode',
    language: 'Language',
    close: 'Close',
    saveChanges: 'Save Changes',
    level: 'Artist Level',
    gems: 'Sonic Gems',
    pro: 'PRO',
    notifications: 'Notifications',
    shop: 'Shop',
    upgradePro: 'Upgrade to PRO',
    premiumFeatures: 'Unlock unlimited tracks & premium sounds',
    buyGems: 'Get Sonic Gems',
    exitApp: 'Exit App',
    instrument: {
      piano: 'Keys',
      guitar: 'Guitar',
      violin: 'Strings',
      drums: 'Drums'
    },
    segment: 'Clip',
    aiSuggestTitle: "'s AI Hint",
    selectFileMsg: 'Import Audio',
    saveToEdit: 'Confirm Changes',
    confirmToEdit: 'Edit Session',
    streak: 'Streak',
    xp: 'XP',
    dailyGoal: 'Daily Goal',
    minutes: 'Min',
    staffEditor: 'Staff',
    trackEditor: 'Tracks',
    aiAssistant: 'AI Assistant'
  }
};

// --- Components ---

/**
 * 触感按钮组件 - Duolingo 风格
 */
const TactileButton = ({
  children,
  variant = 'primary',
  className = '',
  onClick,
  disabled = false,
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'quaternary';
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}) => {
  const themes = {
    primary: 'bg-primary border-primary-dark text-white shadow-[0_6px_0_0_#46a302]',
    secondary: 'bg-secondary border-secondary-dark text-white shadow-[0_6px_0_0_#1a5276]',
    tertiary: 'bg-tertiary border-tertiary-dark text-on-surface shadow-[0_6px_0_0_#9a7000]',
    quaternary: 'bg-quaternary border-quaternary-dark text-white shadow-[0_6px_0_0_#d33131]',
    ghost: 'bg-white border-2 border-outline-variant text-[#4b4b4b] hover:bg-[#f7f7f7] shadow-[0_6px_0_0_rgba(0,0,0,0.05)]',
  };

  return (
    <motion.button
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { y: 6 }}
      onClick={disabled ? undefined : onClick}
      className={`
        relative px-6 py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3
        border-b-0 transition-all select-none
        ${themes[variant]}
        ${disabled ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer hover:brightness-105 active:brightness-95'}
        ${className}
      `}
    >
      {children}
    </motion.button>
  );
};

/**
 * 视图容器组件 - 带动画效果
 */
const ViewContainer = ({ children, className = '' }: { children: React.ReactNode, key?: string | number, className?: string }) => (
  <motion.div
    initial="initial"
    animate="animate"
    exit="exit"
    variants={{
      initial: { opacity: 0, x: 20 },
      animate: {
        opacity: 1,
        x: 0,
        transition: {
          staggerChildren: 0.1
        }
      },
      exit: { opacity: 0, x: -20 }
    }}
    className={`flex-1 overflow-y-auto no-scrollbar p-6 pb-32 space-y-8 ${className}`}
  >
    {React.Children.map(children, (child) => {
      if (!child) return null;
      return (
        <motion.div
          variants={{
            initial: { opacity: 0, y: 10 },
            animate: { opacity: 1, y: 0 }
          }}
        >
          {child}
        </motion.div>
      );
    })}
  </motion.div>
);

/**
 * 加载中占位组件
 */
function LoadingFallback() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-gray-400">加载编辑器中...</p>
      </div>
    </div>
  );
}

// --- Main App ---

export default function App() {
  // 项目状态
  const { project, saveProjectToSupabase } = useProjectStore();
  const { status, user } = useAuthStore();

  // 自动保存功能
  useAutoSave(
    async () => {
      if (status === 'authenticated' && user) {
        await saveProjectToSupabase();
      }
    },
    {
      delay: 5000,
      enabled: status === 'authenticated',
      deps: [project, status, user],
    }
  );

  // 标签页状态
  const [activeTab, setActiveTab] = useState<AppTab>('tracks');
  const [activeView, setActiveView] = useState<EditorView>('main');
  const [selectedInstrument, setSelectedInstrument] = useState('piano');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  // 应用设置状态
  const [darkMode, setDarkMode] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [userName, setUserName] = useState('Artist');
  const [userUid] = useState('SONIC-' + Math.random().toString(36).substring(2, 7).toUpperCase());
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [lang, setLang] = useState<Language>('zh');
  const [xp, setXp] = useState(1250);
  const [gems, setGems] = useState(240);
  const [isPro, setIsPro] = useState(false);
  const [streak, setStreak] = useState(7);
  const [dailyGoal, setDailyGoal] = useState(15);
  const [practicedToday, setPracticedToday] = useState(10);
  const [avatarSeed, setAvatarSeed] = useState('Felix');
  const [isGoalSettingsOpen, setIsGoalSettingsOpen] = useState(false);
  const [isGoalReachedCelebration, setIsGoalReachedCelebration] = useState(false);
  const [toast, setToast] = useState<{ message: string; type?: 'info' | 'success' | 'error' } | null>(null);

  // 编辑器状态
  const [isCreating, setIsCreating] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [showAddWorkSelection, setShowAddWorkSelection] = useState(false);
  const [selectedHistoryTrack, setSelectedHistoryTrack] = useState<string | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [isAdvancedEditing, setIsAdvancedEditing] = useState(false);
  const [activeOverlay, setActiveOverlay] = useState<'share' | 'loop' | 'saving' | 'sharing' | null>(null);
  const [showLoopChoice, setShowLoopChoice] = useState(false);
  const [trackToDelete, setTrackToDelete] = useState<Track | null>(null);
  const [isEditingTrackId, setIsEditingTrackId] = useState<string | null>(null);
  const [hasConfirmedRecord, setHasConfirmedRecord] = useState(false);
  const [trackOptionsId, setTrackOptionsId] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // 播放状态
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [playProgress, setPlayProgress] = useState(0);
  const [playheadPos, setPlayheadPos] = useState(35);

  const scrollRef = useRef<HTMLDivElement>(null);

  const t = translations[lang];

  // 本地音轨数据
  const [tracks, setTracks] = useState<Track[]>([
    { id: '1', title: '霓虹夜景', genre: '合成器波', bpm: 105, duration: '03:12', progress: 40 },
    { id: '2', title: '原声日出', genre: '民谣', bpm: 85, duration: '02:45', progress: 100 },
    { id: '3', title: '城市脉搏', genre: '嘻哈', bpm: 92, duration: '04:01', progress: 0 },
  ]);

  const [segments, setSegments] = useState<Segment[]>([]);

  const instruments: Instrument[] = [
    { id: 'piano', nameKey: 'piano', icon: <Keyboard /> },
    { id: 'guitar', nameKey: 'guitar', icon: <Music /> },
    { id: 'violin', nameKey: 'violin', icon: <Waves /> },
    { id: 'drums', nameKey: 'drums', icon: <Disc /> },
  ];

  // 停止播放当切换标签页
  useEffect(() => {
    setPlayingTrackId(null);
    setPlayProgress(0);
  }, [activeTab]);

  // 录音计时器
  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
        if (scrollRef.current) {
          scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // 练习时间追踪
  useEffect(() => {
    let interval: any;
    if (activeTab === 'record' || activeTab === 'edit') {
      interval = setInterval(() => {
        setPracticedToday(prev => {
          const next = prev + (1 / 60);
          if (Math.floor(next) === dailyGoal && Math.floor(prev) < dailyGoal) {
            setIsGoalReachedCelebration(true);
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTab, dailyGoal]);

  // 播放模拟
  useEffect(() => {
    let interval: any;
    if (playingTrackId) {
      interval = setInterval(() => {
        setPlayProgress(prev => (prev >= 100 ? 0 : prev + 2));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [playingTrackId]);

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      setHasConfirmedRecord(true);
    } else if (hasConfirmedRecord) {
      setActiveTab('edit');
      setHasConfirmedRecord(false);
      setSegments([{ id: 'recorded-' + Date.now(), type: 'original', start: 10, width: 40, trackIndex: 0 }]);
    } else {
      setIsRecording(true);
      setRecordingTime(0);
    }
  };

  const togglePlayback = (id: string) => {
    if (playingTrackId === id) {
      setPlayingTrackId(null);
    } else {
      setPlayingTrackId(id);
      setSelectedHistoryTrack(id);
      setPlayProgress(0);
    }
  };

  const handleNewWork = () => {
    if (isCreating) {
      setShowSavePrompt(true);
    } else {
      setShowAddWorkSelection(true);
    }
  };

  const addSelectedTrackToEditor = (trackId: string) => {
    setIsCreating(true);
    setShowAddWorkSelection(false);
    const track = tracks.find(t => t.id === trackId);
    if (track) {
      setSegments([{ id: 'imported-' + trackId, type: 'original', start: 0, width: 50, trackIndex: 0 }]);
    }
  };

  const saveWork = () => {
    const newId = (tracks.length + 1).toString();
    setTracks([{ id: newId, title: lang === 'zh' ? '新作品' : 'New Piece', genre: 'AI', bpm: 120, duration: '00:45', progress: 0 }, ...tracks]);
    setIsCreating(false);
    setShowSavePrompt(false);
    setSegments([]);
  };

  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleExport = () => {
    if (!selectedHistoryTrack) {
      showToast(t.sharePrompt, 'error');
      return;
    }
    setActiveOverlay('sharing');
  };

  const formatSeconds = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getSegmentName = () => {
    const idx = segments.findIndex(s => s.id === selectedSegmentId);
    return idx === -1 ? `1` : `${idx + 1}`;
  };

  const currentEditingSegment = segments.find(s => s.id === selectedSegmentId);

  const handleDeleteTrack = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const track = tracks.find(t => t.id === id);
    if (track) {
      setTrackToDelete(track);
    }
    setTrackOptionsId(null);
  };

  const confirmDelete = () => {
    if (trackToDelete) {
      setTracks(prev => prev.filter(t => t.id !== trackToDelete.id));
      setTrackToDelete(null);
    }
  };

  const handleEditFromHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveTab('edit');
    setSegments([
      { id: 'track-original-' + id, type: 'original', start: 0, width: 60, trackIndex: 0 },
      { id: 'track-ai-' + id, type: 'ai', start: 65, width: 30, trackIndex: 1 }
    ]);
    setTrackOptionsId(null);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 切换到五线谱编辑器
  const openStaffEditor = () => {
    setActiveView('staff');
  };

  // 切换到音轨编辑器
  const openTrackEditor = () => {
    setActiveView('waveform');
  };

  // 返回主视图
  const backToMain = () => {
    setActiveView('main');
    setIsAdvancedEditing(false);
  };

  // 渲染主内容区域
  const renderMainContent = () => {
    if (activeView === 'staff') {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b-2 border-outline-variant bg-white px-4 py-2">
              <button
                onClick={backToMain}
                className="flex items-center gap-2 rounded-xl bg-surface-container px-3 py-2 font-black text-sm transition-all hover:bg-primary hover:text-white"
              >
                <ArrowLeft size={18} />
                {t.close}
              </button>
              <h2 className="font-black text-primary">{t.staffEditor}</h2>
              <div className="w-20" />
            </div>
            <div className="flex-1 overflow-hidden">
              <StaffEditor />
            </div>
          </div>
        </Suspense>
      );
    }

    if (activeView === 'waveform') {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b-2 border-outline-variant bg-white px-4 py-2">
              <button
                onClick={backToMain}
                className="flex items-center gap-2 rounded-xl bg-surface-container px-3 py-2 font-black text-sm transition-all hover:bg-primary hover:text-white"
              >
                <ArrowLeft size={18} />
                {t.close}
              </button>
              <h2 className="font-black text-primary">{t.trackEditor}</h2>
              <div className="w-20" />
            </div>
            <div className="flex-1 overflow-hidden">
              <TrackEditor />
            </div>
          </div>
        </Suspense>
      );
    }

    // 主视图 - 根据 activeTab 渲染不同内容
    return (
      <>
        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'record' && (
            <ViewContainer key="record">
              <div ref={scrollRef} className="overflow-y-auto no-scrollbar h-full space-y-10 pb-20">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center space-y-3 mt-4"
                >
                  <h2 className="text-3xl font-black text-primary uppercase tracking-tight">{t.whatPlaying}</h2>
                  <p className="text-on-surface-variant font-bold text-sm">{t.chooseInst}</p>
                </motion.div>

                <div className="grid grid-cols-2 gap-4">
                  {instruments.map((inst, idx) => (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      key={inst.id}
                      onClick={() => setSelectedInstrument(inst.id)}
                      className={`
                        aspect-square rounded-[32px] border-2 p-6 flex flex-col items-center justify-center gap-3 transition-all relative cursor-pointer
                        ${selectedInstrument === inst.id
                          ? 'bg-white border-primary border-b-[8px] shadow-lg translate-y-[-4px]'
                          : 'bg-surface-container-low border-black/10 border-b-6 hover:border-primary/50 opacity-90 hover:opacity-100'}
                      `}
                    >
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${selectedInstrument === inst.id ? 'bg-primary text-white shadow-[0_4px_0_0_#46a302]' : 'bg-surface-container text-outline'}`}>
                        {inst.icon}
                      </div>
                      <span className={`font-black uppercase text-xs tracking-widest ${selectedInstrument === inst.id ? 'text-primary' : 'text-outline-variant'}`}>
                        {t.instrument[inst.nameKey as keyof typeof t.instrument]}
                      </span>
                      {selectedInstrument === inst.id && (
                        <motion.div layoutId="check" className="absolute top-4 right-4 w-7 h-7 bg-primary rounded-full flex items-center justify-center shadow-md">
                          <Check className="w-4 h-4 text-white" strokeWidth={5} />
                        </motion.div>
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* Vibe input & Upload */}
                <div className="flex gap-4">
                  <div className="bg-white border-2 border-outline-variant border-b-4 rounded-[24px] p-4 flex items-center gap-3 shadow-sm flex-1 transition-all focus-within:border-primary">
                    <Sparkles className="text-secondary" size={24} />
                    <input
                      placeholder={t.describeVibe}
                      className="bg-transparent border-none focus:ring-0 w-full placeholder-outline-variant font-black outline-none text-on-surface text-sm"
                    />
                  </div>
                  <button className="w-14 h-14 bg-white border-2 border-outline-variant border-b-[6px] rounded-[24px] flex items-center justify-center active:translate-y-1 active:border-b-2 transition-all text-outline-variant hover:text-primary">
                    <Upload size={24} strokeWidth={3} />
                  </button>
                </div>

                {/* Record Button & Timer Bar */}
                <div className="space-y-6">
                  <TactileButton
                    className={`w-full py-5 text-lg font-black transition-all ${isRecording ? 'bg-quaternary shadow-[0_8px_0_0_#d33131]' : hasConfirmedRecord ? 'bg-secondary animate-pulse shadow-[0_8px_0_0_#1a5276]' : 'bg-primary shadow-[0_8px_0_0_#46a302]'}`}
                    onClick={toggleRecording}
                  >
                    <AnimatePresence mode="wait">
                      {isRecording ? (
                        <motion.div key="stop" initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex items-center gap-3">
                          <Square fill="currentColor" size={24} /> {t.stopRecord}
                        </motion.div>
                      ) : hasConfirmedRecord ? (
                        <motion.div key="confirm" initial={{ scale: 0.8, y: 10 }} animate={{ scale: 1, y: 0 }} className="flex items-center gap-3">
                          <CheckCircle2 size={24} /> {lang === 'zh' ? '准备好了' : 'Ready'}
                        </motion.div>
                      ) : (
                        <motion.div key="start" initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex items-center gap-3 text-white">
                          <Mic size={24} strokeWidth={3} /> {t.startRecord}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </TactileButton>

                  {isRecording && (
                    <motion.div
                      layoutId="rec-bar"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white border-2 border-outline-variant border-b-6 rounded-[32px] p-6 flex flex-col items-center gap-4 shadow-xl"
                    >
                      <div className="flex items-center gap-3 text-4xl font-mono font-black text-quaternary">
                        <Timer size={36} strokeWidth={3} className="animate-pulse" />
                        {formatSeconds(recordingTime)}
                      </div>
                      <div className="text-xs font-black text-outline uppercase tracking-widest animate-bounce">
                        Recording Live...
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </ViewContainer>
          )}

          {activeTab === 'tracks' && (
            <ViewContainer key="tracks">
              {!isPro && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => setIsShopOpen(true)}
                  className="bg-gradient-to-r from-secondary to-secondary-dark p-4 rounded-3xl flex items-center justify-between border-b-6 border-black/20 cursor-pointer shadow-xl overflow-hidden relative active:translate-y-1 active:border-b-2 transition-all"
                >
                  <div className="absolute -right-4 -top-8 w-24 h-24 bg-white/20 rounded-full blur-xl" />
                  <div className="flex items-center gap-3 relative z-10">
                    <div className="w-10 h-10 bg-white/30 rounded-xl flex items-center justify-center text-white border border-white/20">
                      <Crown size={20} fill="currentColor" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-white uppercase tracking-tighter">Limited Offer</div>
                      <div className="text-[10px] font-bold text-white/80">Get 50% off SONIC PRO today!</div>
                    </div>
                  </div>
                  <div className="bg-white text-secondary px-3 py-1 rounded-full font-black text-[10px] shadow-lg relative z-10">
                    UPGRADE
                  </div>
                </motion.div>
              )}

              {/* Daily Practice Goal */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsGoalSettingsOpen(true)}
                className="bg-primary/10 border-2 border-primary p-6 rounded-3xl flex items-center justify-between gap-4 cursor-pointer group transition-all hover:bg-primary/15"
              >
                <div className="flex-1">
                  <h3 className="text-primary text-xl font-black mb-1 uppercase tracking-tight flex items-center gap-2">
                    {t.dailyGoal}
                    <Settings size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-primary">{Math.floor(practicedToday)}</span>
                    <span className="text-sm font-bold text-primary/60">/ {dailyGoal} {t.minutes}</span>
                  </div>
                  <div className="w-full h-3 bg-white/50 rounded-full mt-3 overflow-hidden border-b-2 border-primary/20">
                    <motion.div
                      className="h-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (practicedToday / dailyGoal) * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-[0_4px_0_0_#46a302] group-hover:rotate-6 transition-transform">
                  <Timer className="text-white" size={32} strokeWidth={3} />
                </div>
              </motion.div>

              {/* 编辑器快捷入口 */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={openStaffEditor}
                  className="bg-white dark:bg-surface-container p-5 rounded-3xl border-2 border-outline-variant border-b-[6px] flex items-center gap-3 text-left group active:translate-y-1 active:border-b-2 transition-all hover:border-primary"
                >
                  <div className="w-12 h-12 rounded-2xl bg-primary shadow-[0_4px_0_0_#46a302] flex items-center justify-center shrink-0 transition-transform group-hover:scale-110">
                    <FileMusic className="text-white" size={24} />
                  </div>
                  <div>
                    <h4 className="font-black text-lg">{t.staffEditor}</h4>
                    <p className="text-xs font-bold text-on-surface-variant/60">编辑音符</p>
                  </div>
                </button>
                <button
                  onClick={openTrackEditor}
                  className="bg-white dark:bg-surface-container p-5 rounded-3xl border-2 border-outline-variant border-b-[6px] flex items-center gap-3 text-left group active:translate-y-1 active:border-b-2 transition-all hover:border-secondary"
                >
                  <div className="w-12 h-12 rounded-2xl bg-secondary shadow-[0_4px_0_0_#1a5276] flex items-center justify-center shrink-0 transition-transform group-hover:scale-110">
                    <LayoutDashboard className="text-white" size={24} />
                  </div>
                  <div>
                    <h4 className="font-black text-lg">{t.trackEditor}</h4>
                    <p className="text-xs font-bold text-on-surface-variant/60">音轨混音</p>
                  </div>
                </button>
              </div>

              {/* Mixing Progress */}
              <div className="bg-white dark:bg-surface-container border-2 border-outline-variant border-b-8 p-6 flex flex-col gap-4 shadow-sm rounded-3xl">
                <div className="flex justify-between items-end">
                  <h2 className="text-2xl font-black text-primary uppercase tracking-tighter">{t.mixing}</h2>
                  {playingTrackId && (
                    <button onClick={() => setPlayingTrackId(null)} className="p-2.5 bg-secondary text-white rounded-2xl shadow-[0_3px_0_0_#1a5276] active:translate-y-0.5 active:shadow-none"><Pause size={20} strokeWidth={3} /></button>
                  )}
                  <span className="px-3 py-1 bg-surface-container rounded-full text-xs font-black border-2 border-outline-variant text-outline">
                    {playingTrackId ? formatSeconds(Math.floor(playProgress)) : '00:00'}
                  </span>
                </div>
                <div className="h-4 bg-surface-variant rounded-full border-2 border-outline-variant overflow-hidden relative shadow-inner">
                  <motion.div
                    animate={{ width: `${playProgress}%` }}
                    className="absolute left-0 h-full bg-primary border-r-2 border-primary-dark"
                  />
                </div>
              </div>

              {/* AI Boosts */}
              <div className={`space-y-4 transition-opacity ${!selectedHistoryTrack ? 'opacity-40 pointer-events-none' : ''}`}>
                <h3 className="flex items-center gap-2 font-black text-xl text-on-surface">
                  <Sparkles className="text-secondary fill-secondary" size={24} /> {t.aiRec}
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <button
                    onClick={() => { setActiveTab('edit'); setIsAdvancedEditing(true); }}
                    className="bg-white dark:bg-surface-container-low p-5 rounded-3xl border-2 border-outline-variant border-b-[6px] flex items-start gap-4 text-left group active:translate-y-1 active:border-b-2 transition-all"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-secondary shadow-[0_4px_0_0_#1a5276] flex items-center justify-center shrink-0 transition-transform group-hover:scale-110">🥁</div>
                    <div className="flex-1">
                      <h4 className="font-black text-lg">{t.recTitle1}</h4>
                      <p className="text-sm font-bold text-on-surface-variant/60">{t.recDesc1}</p>
                    </div>
                    <Plus className="text-outline-variant" strokeWidth={3} />
                  </button>
                  <button
                    onClick={() => { setActiveTab('edit'); setIsAdvancedEditing(true); }}
                    className="bg-white dark:bg-surface-container-low p-5 rounded-3xl border-2 border-outline-variant border-b-[6px] flex items-start gap-4 text-left group active:translate-y-1 active:border-b-2 transition-all"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-tertiary shadow-[0_4px_0_0_#9a7000] flex items-center justify-center shrink-0 transition-transform group-hover:scale-110">🌉</div>
                    <div className="flex-1">
                      <h4 className="font-black text-lg">{t.recTitle2}</h4>
                      <p className="text-sm font-bold text-on-surface-variant/60">{t.recDesc2}</p>
                    </div>
                    <Plus className="text-outline-variant" strokeWidth={3} />
                  </button>
                </div>
              </div>

              {/* Track List */}
              <div className="space-y-4 pt-4">
                <h3 className="font-black text-xl text-on-surface">
                  {t.history}
                </h3>
                <div className="space-y-4">
                  {tracks.length > 0 ? (
                    tracks.map(track => (
                      <div
                        key={track.id}
                        onClick={() => togglePlayback(track.id)}
                        className={`
                          bg-white dark:bg-surface-container p-4 rounded-[28px] border-2 border-b-[6px]
                          flex items-center gap-4 transition-all cursor-pointer select-none
                          ${playingTrackId === track.id ? 'border-secondary' : 'border-outline-variant hover:border-primary'}
                          active:translate-y-1 active:border-b-2
                        `}
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); togglePlayback(track.id); }}
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${playingTrackId === track.id ? 'bg-secondary text-white shadow-[0_4px_0_0_#1a5276]' : 'bg-surface-container text-outline'}`}
                        >
                          {playingTrackId === track.id ? <Pause size={28} strokeWidth={3} /> : <Play fill="currentColor" size={28} className="translate-x-0.5" />}
                        </button>

                        <div className="flex-1 min-w-0">
                          {isEditingTrackId === track.id ? (
                            <input
                              autoFocus
                              onBlur={() => setIsEditingTrackId(null)}
                              onKeyDown={(e) => e.key === 'Enter' && setIsEditingTrackId(null)}
                              value={track.title}
                              onChange={(e) => {
                                const val = e.target.value;
                                setTracks(prev => prev.map(t => t.id === track.id ? { ...t, title: val } : t));
                              }}
                              className="w-full bg-surface-container rounded-xl px-2 py-1 font-black outline-none border-2 border-primary"
                            />
                          ) : (
                            <div className="flex items-center gap-2 group">
                              <h4 className="font-black text-lg truncate">{track.title}</h4>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsEditingTrackId(track.id);
                                }}
                                className="opacity-100 p-1 bg-secondary/10 rounded-lg text-secondary hover:scale-110 transition-transform"
                              >
                                <Edit2 size={14} strokeWidth={3} />
                              </button>
                            </div>
                          )}
                          <p className="text-[11px] font-black text-on-surface-variant/60 uppercase tracking-widest">{track.genre} • {track.bpm} BPM</p>
                        </div>

                        <div className="relative">
                          <button
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border-2 ${trackOptionsId === track.id ? 'bg-primary text-white border-primary rotate-45 shadow-[0_4px_0_0_#46a302]' : 'bg-white border-outline-variant text-outline-variant shadow-[0_4px_0_0_rgba(0,0,0,0.05)]'} active:translate-y-[4px] active:shadow-none`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setTrackOptionsId(trackOptionsId === track.id ? null : track.id);
                            }}
                          >
                            <Plus size={24} strokeWidth={3} />
                          </button>

                          <AnimatePresence>
                            {trackOptionsId === track.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.8, x: 20 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.8, x: 20 }}
                                className="absolute right-12 top-0 bg-white border-2 border-outline-variant border-b-4 rounded-[20px] shadow-2xl z-50 flex flex-col min-w-[140px] overflow-hidden"
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedHistoryTrack(track.id);
                                    setActiveOverlay('sharing');
                                    setTrackOptionsId(null);
                                  }}
                                  className="px-5 py-4 text-left font-black flex items-center gap-3 hover:bg-secondary/10 text-secondary transition-colors border-b-2 border-outline-variant text-sm"
                                >
                                  <Share2 size={18} strokeWidth={3} /> {lang === 'zh' ? '分享' : 'Share'}
                                </button>
                                <button
                                  onClick={(e) => handleEditFromHistory(track.id, e)}
                                  className="px-5 py-4 text-left font-black flex items-center gap-3 hover:bg-surface-container transition-colors border-b-2 border-outline-variant text-sm"
                                >
                                  <Edit2 size={18} strokeWidth={3} /> {lang === 'zh' ? '编辑' : 'Edit'}
                                </button>
                                <button
                                  onClick={(e) => handleDeleteTrack(track.id, e)}
                                  className="px-5 py-4 text-left font-black flex items-center gap-3 hover:bg-quaternary/10 text-quaternary transition-colors text-sm"
                                >
                                  <Trash2 size={18} strokeWidth={3} /> {lang === 'zh' ? '删除' : 'Delete'}
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-surface-container/30 border-2 border-dashed border-outline-variant rounded-3xl p-12 text-center flex flex-col items-center gap-4">
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-outline-variant shadow-sm">
                        <Disc size={32} strokeWidth={1} />
                      </div>
                      <div>
                        <p className="font-black text-outline">{lang === 'zh' ? '暂无音轨' : 'No Tracks Yet'}</p>
                        <p className="text-xs font-bold text-outline-variant px-4 mt-1">{lang === 'zh' ? '开始录制你的第一个音乐灵感吧！' : 'Start recording your first musical spark!'}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </ViewContainer>
          )}

          {activeTab === 'edit' && (
            <ViewContainer key="edit">
              <div className="flex items-center justify-between gap-4 p-2 bg-white dark:bg-surface-container rounded-[24px] border-2 border-black/10 border-b-6 shadow-sm">
                <div className="flex gap-1 p-1 bg-surface-container-high rounded-xl border-b-2 border-black/10">
                  <button
                    onClick={() => {
                      showToast(lang === 'zh' ? '已撤销' : 'Undo');
                    }}
                    className="w-10 h-10 rounded-lg flex items-center justify-center active:translate-y-0.5 transition-all bg-white border-2 border-black/10 text-outline hover:text-primary shadow-sm"
                  >
                    <Undo size={18} strokeWidth={3} />
                  </button>
                  <div className="w-[1px] bg-outline-variant/50 h-5 my-auto" />
                  <button
                    onClick={() => {
                      showToast(lang === 'zh' ? '已重做' : 'Redo');
                    }}
                    className="w-10 h-10 rounded-lg flex items-center justify-center active:translate-y-0.5 transition-all bg-white border-2 border-black/10 text-outline opacity-40 cursor-not-allowed shadow-sm"
                  >
                    <Redo size={18} strokeWidth={3} />
                  </button>
                </div>
                <TactileButton
                  variant={isCreating ? 'secondary' : 'primary'}
                  className={`flex-1 py-1 h-11 text-xs font-black transition-all ${isCreating ? 'ring-4 ring-secondary-container' : ''}`}
                  onClick={handleNewWork}
                >
                  {isCreating ? t.creating : t.newWork}
                </TactileButton>
              </div>

              {/* Timeline Simulator */}
              <div className="bg-white border-2 border-outline-variant border-b-8 rounded-[32px] overflow-hidden shadow-sm transition-all focus-within:border-primary">
                <div className="h-12 bg-surface-container/50 border-b-2 border-outline-variant flex items-center justify-between px-6">
                  <div className="text-[11px] font-black text-outline uppercase tracking-widest">{lang === 'zh' ? '时间轴' : 'Timeline'}</div>
                  <div className="px-3 py-1 bg-primary/10 rounded-full text-[12px] font-mono font-black text-primary border-2 border-primary/20">
                    {formatSeconds(Math.floor(playheadPos * 0.6))} / 01:00
                  </div>
                </div>
                <div className="p-4 space-y-4 relative bg-[#f8fcf3] min-h-[220px]">
                  {/* Grid Lines */}
                  {[0, 20, 40, 60, 80].map(p => (
                    <div key={p} className="absolute top-0 bottom-0 border-l border-outline-variant/20 pointer-events-none" style={{ left: `${p}%` }} />
                  ))}

                  {/* Playhead */}
                  <motion.div
                    drag="x"
                    dragConstraints={{ left: -100, right: 300 }}
                    onDrag={(_, info) => {
                      const newPos = Math.max(0, Math.min(100, playheadPos + (info.delta.x / 4)));
                      setPlayheadPos(newPos);
                    }}
                    className="absolute top-0 bottom-0 w-[4px] bg-tertiary z-20 cursor-grab active:cursor-grabbing"
                    style={{ left: `${playheadPos}%` }}
                  >
                    <div className="w-6 h-6 bg-tertiary rounded-full absolute -top-3 -left-[10px] border-4 border-white shadow-md active:scale-125 transition-transform" />
                  </motion.div>

                  {/* Tracks */}
                  {segments.length > 0 ? (
                    <div className="space-y-4">
                      {[0, 1, 2].map((trackIdx) => (
                        <div key={trackIdx} className="h-14 flex gap-4">
                          <div className="w-10 h-full bg-surface-variant rounded-xl border-2 border-outline-variant flex items-center justify-center shrink-0">
                            {trackIdx === 0 ? <Keyboard size={16} /> : trackIdx === 1 ? <Disc size={16} /> : <Volume2 size={16} />}
                          </div>
                          <div className="flex-1 relative">
                            {segments.filter(s => s.trackIndex === trackIdx).map(seg => (
                              <button
                                key={seg.id}
                                onDoubleClick={() => setIsAdvancedEditing(true)}
                                onClick={() => setSelectedSegmentId(seg.id)}
                                className={`
                                  absolute h-full border-2 border-b-4 rounded-lg shadow-sm transition-all hover:brightness-105 active:scale-95 flex items-center justify-center overflow-hidden
                                  ${seg.type === 'original' ? 'bg-secondary-container border-[#004666]' : ''}
                                  ${seg.type === 'ai' ? 'bg-red-300 border-red-700' : ''}
                                  ${seg.type === 'harmony' ? 'bg-yellow-300 border-yellow-700' : ''}
                                `}
                                style={{ left: `${seg.start}%`, width: `${seg.width}%` }}
                              >
                                <span className={`text-[8px] font-black uppercase opacity-60 truncate px-1 ${
                                  seg.type === 'original' ? 'text-secondary' : seg.type === 'ai' ? 'text-quaternary' : 'text-tertiary'
                                }`}>
                                  {seg.type === 'original' ? 'REC' : seg.type === 'ai' ? 'AI' : 'FIX'}
                                </span>
                                {selectedSegmentId === seg.id && (
                                  <div className="absolute -top-4 right-0 w-7 h-7 rounded-full bg-primary-container text-white text-[10px] font-extrabold flex items-center justify-center border-2 border-white shadow-md">
                                    {getSegmentName()}
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-48 text-outline italic text-sm">{lang === 'zh' ? '点击"加入作品"开始创作' : 'Click "Add Work" to start'}</div>
                  )}
                </div>
              </div>

              {/* 高级编辑按钮 */}
              <button
                onClick={openStaffEditor}
                className="w-full bg-white dark:bg-surface-container-low p-5 rounded-3xl border-2 border-outline-variant border-b-[6px] flex items-center gap-4 text-left group active:translate-y-1 active:border-b-2 transition-all hover:border-primary"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary shadow-[0_4px_0_0_#46a302] flex items-center justify-center shrink-0 transition-transform group-hover:scale-110">
                  <Sparkles className="text-white" size={24} />
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-lg">{t.advanceTitle}</h4>
                  <p className="text-sm font-bold text-on-surface-variant/60">{t.staffViz}</p>
                </div>
                <ArrowLeft className="text-outline-variant rotate-180" strokeWidth={3} />
              </button>

              {/* AI Suggestion Bubble */}
              <motion.div
                animate={{ opacity: segments.length > 0 ? 1 : 0 }}
                className="bg-[#f0f8e9] dark:bg-surface-container-low border-2 border-primary/20 rounded-3xl p-6 relative shadow-sm"
              >
                <div className="absolute -top-4 left-[35%] w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[16px] border-b-primary-container" />
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <Sparkles className="text-primary fill-primary" />
                    <h2 className="text-xl font-extrabold text-primary leading-tight">
                      {t.segment} {getSegmentName()} {t.aiSuggestTitle}
                    </h2>
                  </div>
                  <button onClick={() => showToast(lang === 'zh' ? '已保存！' : 'Saved!', 'success')} className="p-2 bg-primary text-white rounded-xl shadow-sm active:scale-90 transition-transform"><Save size={18} /></button>
                </div>
                <div className="space-y-3">
                  <TactileButton variant="primary" className="w-full py-3 text-base" onClick={() => {
                    setSegments([...segments, { id: `ai-${Date.now()}`, type: 'ai', start: playheadPos, width: 25, trackIndex: 1 }]);
                  }}>
                    <Music size={18} /> {t.jazz}
                  </TactileButton>
                  <TactileButton variant="ghost" className="w-full py-3 text-base" onClick={() => {
                    setSegments([...segments, { id: `harm-${Date.now()}`, type: 'harmony', start: segments.find(s => s.id === selectedSegmentId)?.start || 0, width: 25, trackIndex: 2 }]);
                  }}>
                    {t.harmony}
                  </TactileButton>
                </div>
              </motion.div>
            </ViewContainer>
          )}

          {activeTab === 'export' && (
            <ViewContainer key="export">
              <div className="text-center space-y-6 pt-12">
                <div className="w-48 h-48 bg-primary-container/20 rounded-full mx-auto flex items-center justify-center ring-8 ring-white dark:ring-surface-container shadow-inner overflow-hidden">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  >
                    <Music className="w-24 h-24 text-primary" strokeWidth={3} />
                  </motion.div>
                </div>
                <div className="space-y-4">
                  <h3 className="font-bold">{t.history}</h3>
                  <div className="flex overflow-x-auto gap-4 no-scrollbar pb-4">
                    {tracks.map(track => (
                      <button
                        key={track.id}
                        onClick={() => setSelectedHistoryTrack(track.id)}
                        className={`shrink-0 w-28 p-3 rounded-2xl border-2 transition-all ${selectedHistoryTrack === track.id ? 'border-primary bg-primary/10 border-b-4 shadow-md' : 'border-black/5 bg-white opacity-80 hover:opacity-100 border-b-2'}`}
                      >
                        <Disc size={32} className="mx-auto mb-2 text-primary" />
                        <div className="text-xs font-bold truncate">{track.title}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <motion.div className="space-y-2">
                  <h2 className="text-3xl font-extrabold text-primary">{t.greatJob}</h2>
                  <p className="text-on-surface-variant font-medium leading-relaxed px-8">{t.readyMsg}</p>
                </motion.div>

                <div className="space-y-4 pt-6">
                  <TactileButton className="w-full" variant="primary" onClick={handleExport}>
                    <Share2 /> {t.exportShare}
                  </TactileButton>
                  <TactileButton className="w-full" variant="ghost" onClick={() => { if (!selectedHistoryTrack) return showToast(t.sharePrompt, 'error'); setShowLoopChoice(true); }}>
                    {t.saveLoop}
                  </TactileButton>
                </div>
              </div>
            </ViewContainer>
          )}
        </AnimatePresence>
      </>
    );
  };

  return (
    <div className={`flex items-center justify-center min-h-screen bg-[#f7f7f7] dark:bg-surface ${darkMode ? 'dark' : ''}`}>
      <style>{`:root { --app-font-size: ${fontSize}px; }`}</style>

      <div className="w-full max-w-md h-[100dvh] bg-white dark:bg-surface flex flex-col relative overflow-hidden text-[var(--app-font-size)] font-sans border-x-4 border-outline-variant shadow-2xl">

        {/* Top Header - Commercialized & Functional */}
        <header className="px-4 py-3 flex items-center justify-between border-b-[3px] border-black/10 bg-white dark:bg-surface sticky top-0 z-[100] shadow-sm">
          {/* Left: Profile & Info */}
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setIsProfileOpen(true)}>
            <div className="relative">
              <div className={`w-11 h-11 rounded-2xl overflow-hidden border-2 transition-all ${isPro ? 'border-secondary ring-2 ring-secondary/20 shadow-[0_4px_0_0_#1a5276]' : 'border-outline-variant group-hover:border-primary shadow-sm'}`}>
                {profileImage ? (
                  <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`} alt="Avatar" className="w-full h-full" />
                )}
              </div>
              {isPro && (
                <div className="absolute -top-1.5 -right-1.5 bg-secondary text-white p-0.5 rounded-lg border-2 border-white shadow-sm scale-75">
                  <Crown size={12} fill="currentColor" />
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm text-primary truncate max-w-[80px] leading-none">{userName}</span>
                {isPro && <span className="bg-secondary text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm tracking-tighter">PRO</span>}
              </div>
              <div className="flex items-center gap-1 mt-1">
                <div className="w-16 h-2 bg-surface-container rounded-full overflow-hidden border border-outline-variant/30 shadow-inner">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${(xp % 1000) / 10}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Stats Container */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-surface-container/50 px-1 py-1 rounded-2xl border-2 border-outline-variant/30 gap-1.5">
              <motion.div
                whileTap={{ scale: 0.9 }}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-white dark:bg-surface rounded-xl border border-outline-variant/50 cursor-pointer shadow-sm active:shadow-none active:translate-y-0.5 transition-all"
                onClick={() => setStreak(s => s + 1)}
              >
                <Zap size={14} fill="currentColor" className="text-tertiary" />
                <span className="font-black text-tertiary text-[11px]">{streak}</span>
              </motion.div>

              <motion.div
                whileTap={{ scale: 0.9 }}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-white dark:bg-surface rounded-xl border border-outline-variant/50 cursor-pointer shadow-sm active:shadow-none active:translate-y-0.5 transition-all"
                onClick={() => setGems(g => g + 10)}
              >
                <Coins size={14} fill="currentColor" className="text-secondary" />
                <span className="font-black text-secondary text-[11px]">{gems}</span>
              </motion.div>
            </div>

            <div className="w-[1px] h-6 bg-outline-variant/30 mx-1" />

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="w-11 h-11 rounded-2xl bg-white dark:bg-surface border-2 border-black/10 border-b-4 hover:border-black/20 flex items-center justify-center text-outline-variant hover:text-primary transition-all active:translate-y-1 active:border-b-0 shadow-sm"
            >
              <Settings size={20} strokeWidth={3} />
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden relative">
          {renderMainContent()}
        </main>

        {/* Global Overlays */}
        <AnimatePresence>
          {showAddWorkSelection && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background z-[110] p-8 flex flex-col gap-6"
            >
              <header className="flex items-center gap-4">
                <button onClick={() => setShowAddWorkSelection(false)} className="p-2 bg-surface-container rounded-full shadow-sm"><ArrowLeft /></button>
                <h2 className="text-2xl font-extrabold">{t.newWork}</h2>
              </header>
              <div className="space-y-4 overflow-y-auto no-scrollbar pb-10">
                {tracks.map(track => (
                  <button
                    key={track.id}
                    onClick={() => addSelectedTrackToEditor(track.id)}
                    className="w-full bg-white dark:bg-surface-container p-4 rounded-3xl border-2 border-outline-variant border-b-4 flex items-center gap-4 active:translate-y-1 active:border-b-0 transition-all hover:border-primary"
                  >
                    <Disc className="text-primary" size={32} />
                    <div className="text-left flex-1">
                      <div className="font-bold">{track.title}</div>
                      <div className="text-xs text-on-surface-variant">{track.genre} • {track.duration}</div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {isShopOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsShopOpen(false)}
                className="absolute inset-0 bg-black/40 z-[120] backdrop-blur-sm"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="absolute inset-x-0 bottom-0 top-12 bg-white dark:bg-surface z-[125] rounded-t-[40px] border-t-4 border-outline-variant shadow-2xl flex flex-col"
              >
                <div className="p-8 pb-4 flex items-center justify-between">
                  <h2 className="text-2xl font-black uppercase tracking-tight text-primary flex items-center gap-2">
                    <Store size={28} strokeWidth={3} /> {t.shop}
                  </h2>
                  <button onClick={() => setIsShopOpen(false)} className="w-12 h-12 bg-surface-container rounded-2xl flex items-center justify-center hover:scale-110 transition-transform">
                    <X size={24} strokeWidth={3} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8 pb-12">
                  {/* PRO Upgrade Card */}
                  <div className="bg-gradient-to-br from-secondary/10 to-primary/10 border-2 border-secondary border-b-8 rounded-[32px] p-8 space-y-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                    <div className="space-y-2 relative">
                      <h3 className="text-3xl font-black text-secondary uppercase leading-none">{t.upgradePro}</h3>
                      <p className="font-bold text-secondary/60 text-sm">{t.premiumFeatures}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { icon: <Headphones size={18} />, label: 'Studio FX' },
                        { icon: <RotateCcw size={18} />, label: 'No Limits' },
                        { icon: <Share2 size={18} />, label: 'Cloud Save' },
                        { icon: <Sparkles size={18} />, label: 'AI Magic' }
                      ].map((feat, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs font-black text-secondary/80">
                          <div className="w-6 h-6 rounded-lg bg-white/50 flex items-center justify-center">{feat.icon}</div>
                          {feat.label}
                        </div>
                      ))}
                    </div>
                    <TactileButton variant="primary" className="w-full bg-secondary shadow-[0_8px_0_0_#1a5276]">
                      START FREE TRIAL
                    </TactileButton>
                  </div>

                  {/* Gems Section */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-end px-2">
                      <h3 className="font-black uppercase tracking-widest text-outline text-xs">{t.buyGems}</h3>
                      <div className="flex items-center gap-1 text-secondary font-black">
                        <Coins size={16} /> {gems}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { gems: 100, price: '¥6.00', icon: '💎' },
                        { gems: 500, price: '¥28.00', icon: '💰', popular: true },
                        { gems: 1000, price: '¥50.00', icon: '🏆' },
                        { gems: 5000, price: '¥198.00', icon: '👑' }
                      ].map((pack, i) => (
                        <button key={i} className={`bg-white border-2 rounded-[24px] p-4 flex flex-col items-center gap-2 transition-all active:scale-95 border-b-6 relative ${pack.popular ? 'border-primary ring-4 ring-primary/10' : 'border-outline-variant'}`}>
                          {pack.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-sm">MOST POPULAR</span>}
                          <span className="text-3xl">{pack.icon}</span>
                          <div className="flex items-center gap-1 font-black text-primary">
                            <Coins size={14} /> {pack.gems}
                          </div>
                          <div className="px-3 py-1 bg-surface-container rounded-lg text-[10px] font-black text-outline">
                            {pack.price}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}

          {isSettingsOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSettingsOpen(false)}
                className="absolute inset-0 bg-black/40 z-[140] backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute inset-x-6 top-20 bg-white dark:bg-surface-container border-2 border-outline-variant border-b-[8px] rounded-[32px] p-6 shadow-2xl z-[145] space-y-6"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-black uppercase tracking-tight text-primary">{t.settings}</h3>
                  <button onClick={() => setIsSettingsOpen(false)} className="p-2 bg-surface-container rounded-xl hover:scale-110 transition-transform"><X size={20} strokeWidth={3} /></button>
                </div>

                <div className="space-y-5">
                  {/* Daily Goal Setting */}
                  <div className="flex justify-between items-center bg-surface-container p-4 rounded-2xl border-b-4 border-outline-variant">
                    <div className="flex items-center gap-3 font-black text-sm text-outline uppercase tracking-widest"><Timer size={18} strokeWidth={3} /> {t.dailyGoal}</div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setDailyGoal(g => Math.max(5, g - 5))} className="w-8 h-8 rounded-lg bg-white border-2 border-outline-variant flex items-center justify-center font-black">-</button>
                      <span className="font-black text-primary w-10 text-center">{dailyGoal}m</span>
                      <button onClick={() => setDailyGoal(g => Math.min(120, g + 5))} className="w-8 h-8 rounded-lg bg-white border-2 border-outline-variant flex items-center justify-center font-black">+</button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-surface-container p-4 rounded-2xl border-b-4 border-outline-variant">
                    <div className="flex items-center gap-3 font-black text-sm text-outline uppercase tracking-widest"><Settings size={18} strokeWidth={3} /> {t.fontSize}</div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setFontSize(f => Math.max(12, f - 2))} className="w-8 h-8 rounded-lg bg-white border-2 border-outline-variant flex items-center justify-center font-black">-</button>
                      <span className="font-black text-primary w-6 text-center">{fontSize}</span>
                      <button onClick={() => setFontSize(f => Math.min(24, f + 2))} className="w-8 h-8 rounded-lg bg-white border-2 border-outline-variant flex items-center justify-center font-black">+</button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-surface-container p-4 rounded-2xl border-b-4 border-outline-variant">
                    <div className="flex items-center gap-3 font-black text-sm text-outline uppercase tracking-widest"><Smartphone size={18} strokeWidth={3} /> {t.darkMode}</div>
                    <button
                      onClick={() => setDarkMode(!darkMode)}
                      className={`w-12 h-6 rounded-full transition-colors relative border-2 ${darkMode ? 'bg-primary border-primary' : 'bg-outline-variant border-outline-variant'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-md ${darkMode ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                  </div>

                  <div className="flex justify-between items-center bg-surface-container p-4 rounded-2xl border-b-4 border-outline-variant">
                    <div className="flex items-center gap-3 font-black text-sm text-outline uppercase tracking-widest"><Languages size={18} strokeWidth={3} /> {t.language}</div>
                    <div className="flex gap-1 p-1 bg-white rounded-xl border-2 border-outline-variant">
                      <button onClick={() => setLang('zh')} className={`px-3 py-1 rounded-lg font-black text-xs transition-all ${lang === 'zh' ? 'bg-primary text-white shadow-[0_2px_0_0_#46a302]' : 'text-outline-variant'}`}>中</button>
                      <button onClick={() => setLang('en')} className={`px-3 py-1 rounded-lg font-black text-xs transition-all ${lang === 'en' ? 'bg-primary text-white shadow-[0_2px_0_0_#46a302]' : 'text-outline-variant'}`}>EN</button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <TactileButton variant="primary" className="w-full py-3 text-sm" onClick={() => setIsSettingsOpen(false)}>{t.close}</TactileButton>
                  <button
                    onClick={() => window.location.reload()}
                    className="w-full py-4 text-sm font-black text-quaternary hover:bg-quaternary/10 rounded-2xl transition-colors flex items-center justify-center gap-2 border-2 border-transparent hover:border-quaternary/20"
                  >
                    <X size={20} strokeWidth={3} /> {t.exitApp}
                  </button>
                </div>
              </motion.div>
            </>
          )}

          {isProfileOpen && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="absolute inset-0 bg-[#f7f7f7] dark:bg-surface z-[115] flex flex-col p-6 gap-8 overflow-y-auto no-scrollbar"
            >
              <header className="flex items-center justify-between">
                <button onClick={() => setIsProfileOpen(false)} className="w-12 h-12 bg-white rounded-2xl border-2 border-outline-variant border-b-4 flex items-center justify-center active:translate-y-1 active:border-b-0 transition-all">
                  <ArrowLeft size={24} strokeWidth={3} className="text-primary" />
                </button>
                <h2 className="text-2xl font-black uppercase tracking-tighter text-primary">{t.profile}</h2>
                <div className="w-12" />
              </header>

              <div className="flex flex-col items-center gap-6">
                <div className="relative group">
                  <div className="w-36 h-36 rounded-[48px] bg-white border-4 border-outline-variant border-b-[10px] p-2 shadow-xl overflow-hidden">
                    {profileImage ? (
                      <img src={profileImage} alt="Profile" className="w-full h-full object-cover rounded-[32px]" />
                    ) : (
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`} alt="Avatar" className="w-full h-full rounded-[32px]" />
                    )}
                  </div>
                  <label className="absolute bottom-[-10px] right-[-10px] w-12 h-12 bg-secondary text-white rounded-2xl border-4 border-white flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 active:scale-90 transition-all">
                    <Upload size={20} strokeWidth={3} />
                    <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                  </label>
                </div>

                <div className="flex gap-3 overflow-x-auto no-scrollbar w-full py-2">
                  {['Felix', 'Maya', 'John', 'Alex', 'Sarah', 'Leo'].map(s => (
                    <button
                      key={s}
                      onClick={() => { setAvatarSeed(s); setProfileImage(null); }}
                      className={`shrink-0 w-16 h-16 rounded-2xl bg-white border-2 border-b-4 transition-all overflow-hidden p-1 ${avatarSeed === s && !profileImage ? 'border-primary ring-4 ring-primary/20 scale-110' : 'border-outline-variant opacity-60'}`}
                    >
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${s}`} alt={s} className="w-full h-full rounded-xl" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white border-2 border-outline-variant border-b-8 rounded-[32px] p-6 space-y-4">
                  <div className="flex items-center justify-between p-4 bg-secondary/5 rounded-2xl border-2 border-secondary/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center text-white shadow-sm">
                        <Crown size={20} fill="currentColor" />
                      </div>
                      <div>
                        <div className="text-sm font-black text-secondary uppercase tracking-tight">{isPro ? 'PRO ACTIVE' : 'FREE ACCOUNT'}</div>
                        <div className="text-[10px] font-bold text-secondary/60">{isPro ? 'Unlimited Access' : 'Upgrade for more tools'}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsPro(!isPro)}
                      className="px-4 py-2 bg-secondary text-white rounded-xl font-black text-xs shadow-[0_4px_0_0_#1a5276] active:translate-y-1 active:shadow-none transition-all"
                    >
                      {isPro ? 'MANAGE' : 'GO PRO'}
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-black uppercase text-outline tracking-widest">{t.userName}</label>
                    <div className="flex items-center gap-3 bg-surface-container p-4 rounded-2xl border-b-4 border-outline-variant">
                      <input
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        className="w-full bg-transparent border-none text-lg font-black p-0 focus:ring-0 text-primary"
                        placeholder="Type name..."
                      />
                      <Edit2 size={20} strokeWidth={3} className="text-outline-variant" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-black uppercase text-outline tracking-widest">{t.userId}</label>
                    <div className="bg-surface-container p-4 rounded-2xl border-b-4 border-outline-variant font-mono font-black text-outline text-lg">
                      {userUid}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <button className="w-full h-16 bg-black text-white rounded-[24px] border-b-[6px] border-gray-800 flex items-center justify-center gap-4 active:translate-y-1 active:border-b-0 transition-all">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                      <Smartphone size={20} className="text-black" />
                    </div>
                    <span className="font-black text-lg">{t.appleId}</span>
                  </button>

                  <TactileButton variant="primary" onClick={() => setIsProfileOpen(false)}>
                    {t.saveChanges}
                  </TactileButton>
                </div>
              </div>
            </motion.div>
          )}

          {isAdvancedEditing && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="absolute inset-0 bg-background z-[110] p-6 flex flex-col gap-6"
            >
              <header className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      setIsAdvancedEditing(false);
                    }}
                    className="p-2 bg-surface-container rounded-full hover:scale-110 transition-transform active:scale-95"
                  >
                    <ArrowLeft />
                  </button>
                  <h2 className="text-2xl font-extrabold">{t.advanceTitle}</h2>
                </div>
                <button
                  onClick={() => {
                    setIsAdvancedEditing(false);
                  }}
                  className="px-6 py-3 bg-primary text-white rounded-2xl font-black flex items-center gap-2 border-b-4 border-primary-dark active:translate-y-1 active:border-b-0 transition-all shadow-lg"
                >
                  <Save size={18} strokeWidth={3} /> {t.saveToEdit}
                </button>
              </header>

              <div className="bg-white dark:bg-surface-container-lowest border-2 border-outline-variant rounded-3xl p-6 min-h-[400px] flex flex-col gap-4 relative overflow-hidden shadow-inner">
                <h3 className={`font-bold text-lg flex items-center gap-2 ${currentEditingSegment?.type === 'ai' ? 'text-red-500' : 'text-green-500'}`}>
                  <Music className={currentEditingSegment?.type === 'ai' ? 'text-red-500' : 'text-green-500'} /> {t.staffViz}
                  <span className="text-sm font-normal opacity-60">({currentEditingSegment?.type === 'ai' ? 'AI' : 'Original'})</span>
                </h3>

                <div className="flex-1 flex flex-col justify-around py-4 opacity-40">
                  {[1, 2, 3, 4, 5].map(i => <div key={i} className={`h-[2px] w-full ${currentEditingSegment?.type === 'ai' ? 'bg-red-300' : 'bg-green-300'}`} />)}
                </div>

                {/* Editable Visualized Staff */}
                <div className="absolute inset-0 flex items-center justify-around p-12">
                  {[
                    { color: currentEditingSegment?.type === 'ai' ? 'bg-red-500' : 'bg-green-500', note: 'C4' },
                    { color: currentEditingSegment?.type === 'ai' ? 'bg-red-400' : 'bg-green-400', note: 'D4' },
                    { color: currentEditingSegment?.type === 'ai' ? 'bg-red-500' : 'bg-green-500', note: 'E4' },
                    { color: currentEditingSegment?.type === 'ai' ? 'bg-red-400' : 'bg-green-400', note: 'F4' },
                    { color: currentEditingSegment?.type === 'ai' ? 'bg-red-500' : 'bg-green-500', note: 'G4' }
                  ].map((note, i) => (
                    <motion.div
                      key={i}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.8 }}
                      onClick={() => {
                        showToast(`${lang === 'zh' ? '正在编辑音符' : 'Editing note'} ${note.note}`);
                      }}
                      animate={{ y: [0, -10 * (i % 3), 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                      className={`w-8 h-8 ${note.color} rounded-full shadow-lg border-2 border-white cursor-pointer flex items-center justify-center text-[10px] text-white font-bold`}
                    >
                      {note.note}
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <TactileButton variant="primary" className="py-3 text-base" onClick={() => showToast(t.jazz, 'success')}>{t.jazz}</TactileButton>
                <TactileButton variant="ghost" className="py-3 text-base" onClick={() => showToast(t.quantize)}>{t.quantize}</TactileButton>
                <TactileButton variant="ghost" className="py-3 text-base" onClick={() => showToast(t.harmony)}>{t.harmony}</TactileButton>
                <TactileButton variant="secondary" className="mt-4" onClick={() => {
                  const input = prompt(t.selectFileMsg);
                  if (input) {
                    setSegments([...segments, { id: 'bg-' + Date.now(), type: 'harmony', start: 0, width: 100, trackIndex: 2 }]);
                    showToast(lang === 'zh' ? '背景音乐已添加' : 'Background music added', 'success');
                  }
                }}><Volume2 /> {t.addBgMusic}</TactileButton>
              </div>
            </motion.div>
          )}

          {(activeOverlay || showLoopChoice) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 z-[160] flex flex-col justify-end p-4 backdrop-blur-sm"
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="bg-white dark:bg-surface-container rounded-[48px] p-8 w-full border-4 border-primary-container shadow-2xl relative"
              >
                <button onClick={() => { setActiveOverlay(null); setShowLoopChoice(false); }} className="absolute top-6 right-6 p-2 text-outline hover:scale-110 transition-transform"><X /></button>

                {showLoopChoice ? (
                  <div className="flex flex-col gap-6">
                    <h3 className="text-2xl font-extrabold text-center">{t.loopPrompt}</h3>
                    <div className="grid grid-cols-1 gap-4">
                      <TactileButton variant="primary" onClick={() => { setShowLoopChoice(false); setActiveOverlay('sharing'); }}>{t.directShare}</TactileButton>
                      <TactileButton variant="secondary" onClick={() => { setShowLoopChoice(false); saveWork(); setActiveOverlay('saving'); }}>{t.saveToHistory}</TactileButton>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-4">
                    <div className="w-24 h-24 bg-primary-container text-white rounded-full flex items-center justify-center mb-6">
                      {activeOverlay === 'sharing' ? <Share2 size={48} className="animate-bounce" /> : <Save size={48} className="animate-pulse" />}
                    </div>
                    <h3 className="text-2xl font-extrabold mb-2">{activeOverlay === 'sharing' ? t.sharing : t.saving}</h3>
                    <div className="w-full h-4 bg-surface-container rounded-full overflow-hidden mt-6 border-2 border-outline-variant shadow-inner">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 2.5 }}
                        onAnimationComplete={() => setTimeout(() => setActiveOverlay(null), 500)}
                        className="h-full bg-primary-container"
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}

          {showSavePrompt && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 z-[150] flex items-center justify-center p-8 backdrop-blur-sm"
            >
              <motion.div className="bg-white dark:bg-surface-container p-6 rounded-3xl w-full text-center border-2 border-outline-variant shadow-2xl">
                <h3 className="text-xl font-bold mb-6">{t.savePrompt}</h3>
                <div className="flex flex-col gap-3">
                  <TactileButton onClick={() => {
                    saveWork();
                  }}>{t.save}</TactileButton>
                  <TactileButton variant="ghost" onClick={() => {
                    setIsCreating(false);
                    setShowSavePrompt(false);
                    setSegments([]);
                  }}>{t.discard}</TactileButton>
                </div>
              </motion.div>
            </motion.div>
          )}

          {isGoalSettingsOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsGoalSettingsOpen(false)}
                className="absolute inset-0 bg-black/40 z-[140] backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute inset-x-6 bottom-32 bg-white dark:bg-surface-container border-2 border-outline-variant border-b-[8px] rounded-[32px] p-8 shadow-2xl z-[145] space-y-6"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-black uppercase tracking-tight text-primary">{t.dailyGoal}</h3>
                  <button onClick={() => setIsGoalSettingsOpen(false)} className="p-2 bg-surface-container rounded-xl hover:scale-110 transition-transform"><X size={20} strokeWidth={3} /></button>
                </div>
                <p className="text-sm font-bold text-outline-variant">{lang === 'zh' ? '设定你的每日音乐创作目标，保持动力！' : 'Set your daily music creation goal and stay motivated!'}</p>

                <div className="flex items-center justify-center gap-6 py-6 bg-surface-container rounded-3xl border-b-4 border-outline-variant">
                  <button
                    onClick={() => setDailyGoal(g => Math.max(5, g - 5))}
                    className="w-16 h-16 rounded-2xl bg-white border-2 border-b-6 border-outline-variant flex items-center justify-center font-black text-2xl active:translate-y-1 active:border-b-2 transition-all hover:border-primary text-outline"
                  >
                    -
                  </button>
                  <div className="flex flex-col items-center">
                    <span className="text-5xl font-black text-primary">{dailyGoal}</span>
                    <span className="text-xs font-black text-outline uppercase tracking-widest">{t.minutes}</span>
                  </div>
                  <button
                    onClick={() => setDailyGoal(g => Math.min(120, g + 5))}
                    className="w-16 h-16 rounded-2xl bg-white border-2 border-b-6 border-outline-variant flex items-center justify-center font-black text-2xl active:translate-y-1 active:border-b-2 transition-all hover:border-primary text-outline"
                  >
                    +
                  </button>
                </div>

                <TactileButton variant="primary" className="w-full" onClick={() => setIsGoalSettingsOpen(false)}>
                  {t.saveChanges}
                </TactileButton>
              </motion.div>
            </>
          )}

          {isGoalReachedCelebration && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-primary/20 z-[200] flex items-center justify-center p-8 backdrop-blur-md"
              onClick={() => setIsGoalReachedCelebration(false)}
            >
              <motion.div
                initial={{ scale: 0.5, y: 50, rotate: -10 }}
                animate={{ scale: 1, y: 0, rotate: 0 }}
                className="bg-white dark:bg-surface-container p-8 rounded-[48px] border-4 border-primary border-b-[12px] shadow-2xl text-center space-y-6 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-secondary to-tertiary" />
                <div className="w-24 h-24 bg-primary rounded-3xl mx-auto flex items-center justify-center shadow-lg -rotate-6">
                  <Sparkles size={48} className="text-white animate-pulse" fill="currentColor" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-4xl font-black text-primary uppercase tracking-tighter">{t.greatJob}</h2>
                  <p className="text-lg font-bold text-outline-variant">
                    {lang === 'zh' ? `已完成今日 ${dailyGoal} 分钟目标！` : `You reached your ${dailyGoal}min goal!`}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 py-2 px-4 bg-primary/10 rounded-full">
                  <Coins size={20} className="text-secondary" fill="currentColor" />
                  <span className="font-black text-secondary text-lg">+100 XP & +50 Gems</span>
                </div>
                <TactileButton variant="primary" className="w-full" onClick={() => {
                  setXp(x => x + 100);
                  setGems(g => g + 50);
                  setIsGoalReachedCelebration(false);
                }}>
                  {lang === 'zh' ? '保持这股劲头！' : 'Keep it up!'}
                </TactileButton>
              </motion.div>
            </motion.div>
          )}

          {trackToDelete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 z-[150] flex items-center justify-center p-8 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white dark:bg-surface-container p-8 rounded-3xl w-full text-center border-4 border-primary-container shadow-2xl space-y-6"
              >
                <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full mx-auto flex items-center justify-center">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-extrabold leading-tight">
                  {lang === 'zh' ? `是否将作品（${trackToDelete.title}）删除？` : `Delete the work "${trackToDelete.title}"?`}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setTrackToDelete(null)}
                    className="py-4 rounded-2xl font-bold bg-surface-container border-2 border-outline-variant active:scale-95 transition-transform"
                  >
                    {lang === 'zh' ? '取消' : 'Cancel'}
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="py-4 rounded-2xl font-bold bg-red-500 text-white shadow-lg active:scale-95 transition-transform"
                  >
                    {lang === 'zh' ? '确认' : 'Confirm'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Navigation - 仅在主视图显示 */}
        {activeView === 'main' && (
          <nav className="absolute border-t-2 border-black/10 bottom-0 left-0 right-0 h-24 bg-white dark:bg-surface-container flex items-center justify-around px-2 z-[90] shadow-[0_-4px_15px_rgba(0,0,0,0.05)]">
            {(['tracks', 'record', 'edit'] as const).map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="relative flex flex-col items-center justify-center gap-0.5 w-1/3 h-full group"
                >
                  <div className="relative">
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          layoutId="navPill"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className={`absolute inset-[-8px] rounded-[24px] z-0 ${
                            tab === 'record' ? 'bg-quaternary/10' : tab === 'edit' ? 'bg-secondary/10' : 'bg-primary/10'
                          }`}
                        />
                      )}
                    </AnimatePresence>

                    <motion.div
                      animate={isActive ? {
                        scale: [1, 1.1, 1],
                        y: [0, -4, 0],
                      } : {}}
                      transition={{ duration: 0.3 }}
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 relative z-10 ${
                        isActive
                          ? (tab === 'record' ? 'bg-quaternary text-white shadow-[0_5px_0_0_#d33131]' : tab === 'edit' ? 'bg-secondary text-white shadow-[0_5px_0_0_#1a5276]' : 'bg-primary text-white shadow-[0_5px_0_0_#46a302]')
                          : 'text-outline-variant group-hover:bg-surface-variant'
                      }`}
                    >
                      {tab === 'tracks' && <Music size={30} strokeWidth={3} />}
                      {tab === 'record' && <Mic size={30} strokeWidth={3} />}
                      {tab === 'edit' && <Headphones size={30} strokeWidth={3} />}
                    </motion.div>
                  </div>
                  <span className={`text-[11px] font-black uppercase tracking-widest transition-colors z-10 ${isActive ? (tab === 'record' ? 'text-quaternary' : tab === 'edit' ? 'text-secondary' : 'text-primary') : 'text-outline-variant'}`}>
                    {t[tab as keyof typeof t] as string}
                  </span>
                  {isActive && (
                    <motion.div layoutId="navMarker" className={`absolute bottom-1 w-8 h-1 rounded-full ${tab === 'record' ? 'bg-quaternary' : tab === 'edit' ? 'bg-secondary' : 'bg-primary'}`} />
                  )}
                </button>
              );
            })}
          </nav>
        )}

        {/* Global Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="absolute bottom-28 left-1/2 -translate-x-1/2 z-[300] w-auto max-w-[80%]"
            >
              <div className={`
                px-6 py-3 rounded-2xl font-black text-sm shadow-2xl border-2 flex items-center gap-3
                ${toast.type === 'error' ? 'bg-quaternary border-quaternary-dark text-white' :
                  toast.type === 'success' ? 'bg-primary border-primary-dark text-white' :
                  'bg-white border-outline-variant text-primary'}
              `}>
                {toast.type === 'success' ? <Check size={18} strokeWidth={3} /> : <Bell size={18} strokeWidth={3} />}
                {toast.message}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Panel */}
        <Suspense fallback={null}>
          <AIPanel />
        </Suspense>

        {/* Auth Modal */}
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      </div>
    </div>
  );
}
