import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth, isTutorialPending, isTutorialDone, markTutorialDone } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { AppTab } from './MobileNav';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  CheckCircle2,
  MousePointerClick,
  Wallet,
  Layers,
  Receipt,
  Calculator
} from 'lucide-react';

interface OnboardingTourProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  manualTriggerCount: number;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TourStepConfig {
  id: string;
  selector?: string;
  title: string;
  description: string;
  actionHint?: string;
  modalHint?: string;
  icon: React.ReactNode;
}

const TOUR_STEPS: TourStepConfig[] = [
  {
    id: 'welcome',
    title: 'Uang Teratur, Hidup Lebih Tenang.',
    description:
      'Semua data awal dimulai dari Rp 0 agar kamu bebas menginput semuanya dari awal. Yuk ikuti panduan singkat 4 langkah ini.',
    icon: <Sparkles className="w-5 h-5 text-[#B8DEC4]" />,
  },
  {
    id: 'income',
    selector: '[data-tour="income-card"]',
    title: '1. Masukkan Target Pemasukan',
    description:
      'Semua jatah pos belanja & tabungan dihitung otomatis dari pemasukan periode ini.',
    actionHint: 'Ketuk "Ubah" di kartu hijau ini, isi nominal pemasukan, lalu ketuk "Simpan".',
    icon: <Wallet className="w-4 h-4 text-[#113829]" />,
  },
  {
    id: 'add-need',
    selector: '[data-tour="add-need-btn"]',
    title: '2. Buat Pos Kebutuhan / Tabungan',
    description:
      'Bagi pemasukanmu ke pos seperti Makan, Bensin, atau Tabungan (nominal tetap atau %).',
    actionHint: 'Ketuk tombol "Tambah Pos" yang disorot untuk membuat pos pertamamu.',
    modalHint: 'Isi Nama Pos, pilih rumus alokasi & nominal, lalu ketuk "Simpan Pos".',
    icon: <Layers className="w-4 h-4 text-[#113829]" />,
  },
  {
    id: 'add-tx',
    selector: '[data-tour="add-tx-btn"]',
    title: '3. Catat Pemasukan & Belanja',
    description:
      'Setiap ada uang masuk atau belanja, catat lewat sini agar sisa pos langsung terupdate.',
    actionHint: 'Ketuk tombol "Catat" yang disorot untuk mencoba mencatat transaksi.',
    modalHint: 'Pilih Pengeluaran atau Pemasukan, isi nominal, lalu ketuk "Simpan Transaksi".',
    icon: <Receipt className="w-4 h-4 text-[#113829]" />,
  },
  {
    id: 'simulasi',
    selector: '[data-tour="simulasi-btn"]',
    title: '4. Uji Simulasi & Cek Analitik',
    description:
      'Gunakan "Simulasi" sebelum belanja besar, atau buka tab Analitik di bawah untuk grafik lengkap.',
    actionHint: 'Coba ketuk "Simulasi" atau langsung tekan "Selesai" untuk mulai.',
    modalHint: 'Ubah skenario di bawah untuk melihat dampaknya pada tabunganmu.',
    icon: <Calculator className="w-4 h-4 text-[#113829]" />,
  },
];

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  activeTab,
  setActiveTab,
  manualTriggerCount,
}) => {
  const { user } = useAuth();
  const {
    isLoading,
    incomeTarget,
    needs,
    transactions,
    isNeedModalOpen,
    isTxModalOpen,
    isWhatIfOpen,
  } = useFinance();

  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);

  const hasAutoTriggeredRef = useRef<string | null>(null);
  const lastHandledTriggerRef = useRef<number>(0);
  const prevIncomeRef = useRef<number>(incomeTarget);
  const prevNeedsCountRef = useRef<number>(needs.length);
  const prevTxCountRef = useRef<number>(transactions.length);

  useEffect(() => {
    if (!user || isLoading) return;
    if (hasAutoTriggeredRef.current === user.id) return;

    const pending = isTutorialPending(user.id);
    const done = isTutorialDone(user.id);
    const isDemo = user.email.toLowerCase() === 'demo@kalkuduit.id';
    const isFreshAccount = needs.length === 0 && transactions.length === 0 && incomeTarget === 0;

    if (pending || (!done && !isDemo && isFreshAccount)) {
      hasAutoTriggeredRef.current = user.id;
      setActiveTab('dashboard');
      setStepIndex(0);
      setIsOpen(true);
    } else {
      hasAutoTriggeredRef.current = user.id;
    }
  }, [user, isLoading, needs.length, transactions.length, incomeTarget, setActiveTab]);

  useEffect(() => {
    if (manualTriggerCount > lastHandledTriggerRef.current) {
      lastHandledTriggerRef.current = manualTriggerCount;
      setActiveTab('dashboard');
      setStepIndex(0);
      setIsOpen(true);
    }
  }, [manualTriggerCount, setActiveTab]);

  const currentStep = TOUR_STEPS[stepIndex];
  const anyAppModalOpen = isNeedModalOpen || isTxModalOpen || isWhatIfOpen;

  const updateTargetPosition = useCallback(() => {
    if (!isOpen || !currentStep?.selector || anyAppModalOpen) {
      setTargetRect(null);
      return;
    }

    const el = document.querySelector(currentStep.selector) as HTMLElement | null;
    if (!el) {
      setTargetRect(null);
      return;
    }

    const rect = el.getBoundingClientRect();
    const pad = 6;
    const next: TargetRect = {
      top: Math.max(0, Math.round(rect.top - pad)),
      left: Math.max(0, Math.round(rect.left - pad)),
      width: Math.min(window.innerWidth, Math.round(rect.width + pad * 2)),
      height: Math.min(window.innerHeight, Math.round(rect.height + pad * 2)),
    };
    setTargetRect((prev) => {
      if (
        prev &&
        prev.top === next.top &&
        prev.left === next.left &&
        prev.width === next.width &&
        prev.height === next.height
      ) {
        return prev;
      }
      return next;
    });
  }, [isOpen, currentStep, anyAppModalOpen]);

  useEffect(() => {
    if (!isOpen || !currentStep?.selector || anyAppModalOpen) return;
    const el = document.querySelector(currentStep.selector) as HTMLElement | null;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    const timer = setTimeout(updateTargetPosition, 120);
    return () => clearTimeout(timer);
  }, [isOpen, stepIndex, currentStep, anyAppModalOpen, updateTargetPosition]);

  useEffect(() => {
    if (!isOpen) return;
    updateTargetPosition();

    window.addEventListener('resize', updateTargetPosition);
    window.addEventListener('scroll', updateTargetPosition, true);
    const observer = new MutationObserver(() => {
      requestAnimationFrame(updateTargetPosition);
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    return () => {
      window.removeEventListener('resize', updateTargetPosition);
      window.removeEventListener('scroll', updateTargetPosition, true);
      observer.disconnect();
    };
  }, [isOpen, updateTargetPosition]);

  useEffect(() => {
    if (!isOpen) {
      prevIncomeRef.current = incomeTarget;
      prevNeedsCountRef.current = needs.length;
      prevTxCountRef.current = transactions.length;
      return;
    }

    if (currentStep.id === 'income' && incomeTarget > 0 && prevIncomeRef.current === 0) {
      const t = setTimeout(() => setStepIndex((s) => Math.min(TOUR_STEPS.length - 1, s + 1)), 450);
      prevIncomeRef.current = incomeTarget;
      return () => clearTimeout(t);
    }
    prevIncomeRef.current = incomeTarget;

    if (currentStep.id === 'add-need' && needs.length > prevNeedsCountRef.current && !isNeedModalOpen) {
      const t = setTimeout(() => setStepIndex((s) => Math.min(TOUR_STEPS.length - 1, s + 1)), 450);
      prevNeedsCountRef.current = needs.length;
      return () => clearTimeout(t);
    }
    prevNeedsCountRef.current = needs.length;

    if (currentStep.id === 'add-tx' && transactions.length > prevTxCountRef.current && !isTxModalOpen) {
      const t = setTimeout(() => setStepIndex((s) => Math.min(TOUR_STEPS.length - 1, s + 1)), 450);
      prevTxCountRef.current = transactions.length;
      return () => clearTimeout(t);
    }
    prevTxCountRef.current = transactions.length;
  }, [
    isOpen,
    currentStep.id,
    incomeTarget,
    needs.length,
    transactions.length,
    isNeedModalOpen,
    isTxModalOpen,
  ]);

  const finishTour = () => {
    if (user) {
      markTutorialDone(user.id);
    }
    setIsOpen(false);
  };

  const handleNext = () => {
    if (stepIndex >= TOUR_STEPS.length - 1) {
      finishTour();
    } else {
      setStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setStepIndex((prev) => Math.max(0, prev - 1));
  };

  if (!isOpen || !user) return null;

  // Step 0: Screen 1 Aesthetic (Dark Forest Green Onboarding Card)
  if (currentStep.id === 'welcome') {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
        <div className="w-full max-w-[380px] rounded-[32px] bg-[#113829] text-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-6 space-y-6">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#C8DFCE] font-semibold">01 / 04</span>
            <div className="flex items-center gap-1.5 flex-1 mx-4">
              <span className="h-1 flex-1 rounded-full bg-white" />
              <span className="h-1 flex-1 rounded-full bg-white/25" />
              <span className="h-1 flex-1 rounded-full bg-white/25" />
              <span className="h-1 flex-1 rounded-full bg-white/25" />
            </div>
            <button
              type="button"
              onClick={finishTour}
              className="text-[#C8DFCE] hover:text-white font-semibold"
            >
              Lewati
            </button>
          </div>

          <div className="space-y-3 pt-2">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-[#B8DEC4]" />
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight leading-tight">
              Halo, {user.name}!
              <br />
              <span className="text-[#B8DEC4]">{currentStep.title}</span>
            </h2>
            <p className="text-xs text-[#C8DFCE] leading-relaxed">
              {currentStep.description}
            </p>
          </div>

          <div className="space-y-2 rounded-2xl bg-white/10 p-4 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full bg-[#B8DEC4] text-[#113829] text-[10px] font-extrabold flex items-center justify-center shrink-0">1</span>
              <span>Isi target pemasukan periode ini</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full bg-[#B8DEC4] text-[#113829] text-[10px] font-extrabold flex items-center justify-center shrink-0">2</span>
              <span>Buat pos kebutuhan & tabungan</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full bg-[#B8DEC4] text-[#113829] text-[10px] font-extrabold flex items-center justify-center shrink-0">3</span>
              <span>Catat transaksi & pantau analitik</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleNext}
            className="w-full py-3.5 rounded-full text-xs font-extrabold text-[#113829] bg-white hover:bg-[#EFEFE8] transition-colors inline-flex items-center justify-center gap-2 shadow-lg"
          >
            <span>Mulai Panduan Interaktif</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Non-blocking top banner when modal is open
  if (anyAppModalOpen) {
    return (
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[60] w-[calc(100vw-24px)] max-w-[416px] pointer-events-auto">
        <div className="rounded-2xl bg-[#113829] text-white px-4 py-3 shadow-2xl border border-[#2A5C48] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-white/15 text-[#B8DEC4] shrink-0">
              <MousePointerClick className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#B8DEC4] block">
                Langkah {stepIndex} dari {TOUR_STEPS.length - 1}
              </span>
              <p className="text-xs text-white leading-snug">
                {currentStep.modalHint || currentStep.actionHint}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={finishTour}
            className="text-[11px] font-semibold text-[#C8DFCE] hover:text-white shrink-0 px-2 py-1 rounded-lg hover:bg-white/10"
          >
            Tutup
          </button>
        </div>
      </div>
    );
  }

  const cardWidth = Math.min(350, window.innerWidth - 24);
  const estimatedCardHeight = 230;
  let tooltipTop = 16;
  let tooltipLeft = (window.innerWidth - cardWidth) / 2;

  if (targetRect) {
    const spaceBelow = window.innerHeight - (targetRect.top + targetRect.height);
    const spaceAbove = targetRect.top;

    if (spaceBelow >= estimatedCardHeight + 16) {
      tooltipTop = targetRect.top + targetRect.height + 12;
    } else if (spaceAbove >= estimatedCardHeight + 16) {
      tooltipTop = Math.max(12, targetRect.top - estimatedCardHeight - 12);
    } else {
      tooltipTop = Math.max(12, window.innerHeight - estimatedCardHeight - 12);
    }

    tooltipLeft = Math.min(
      Math.max(12, targetRect.left),
      window.innerWidth - cardWidth - 12
    );
  }

  const isLastStep = stepIndex === TOUR_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none">
      {targetRect ? (
        <>
          <div
            className="fixed left-0 top-0 right-0 bg-black/55 backdrop-blur-[1px] pointer-events-auto transition-all duration-200"
            style={{ height: targetRect.top }}
          />
          <div
            className="fixed left-0 right-0 bottom-0 bg-black/55 backdrop-blur-[1px] pointer-events-auto transition-all duration-200"
            style={{ top: targetRect.top + targetRect.height }}
          />
          <div
            className="fixed left-0 bg-black/55 backdrop-blur-[1px] pointer-events-auto transition-all duration-200"
            style={{
              top: targetRect.top,
              height: targetRect.height,
              width: targetRect.left,
            }}
          />
          <div
            className="fixed right-0 bg-black/55 backdrop-blur-[1px] pointer-events-auto transition-all duration-200"
            style={{
              top: targetRect.top,
              height: targetRect.height,
              left: targetRect.left + targetRect.width,
            }}
          />
          <div
            className="fixed rounded-3xl ring-2 ring-[#78AD8F] shadow-[0_0_0_4px_rgba(120,173,143,0.28)] pointer-events-none transition-all duration-200"
            style={{
              top: targetRect.top,
              left: targetRect.left,
              width: targetRect.width,
              height: targetRect.height,
            }}
          />
        </>
      ) : (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-[1px] pointer-events-auto" />
      )}

      <div
        className="fixed pointer-events-auto rounded-3xl bg-[#FAF8F5] border border-[#E6E5DD] shadow-2xl p-4 space-y-3 transition-all duration-200"
        style={{
          top: tooltipTop,
          left: tooltipLeft,
          width: cardWidth,
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#EAEFE4] shrink-0">
              {currentStep.icon}
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#113829] uppercase tracking-wider block">
                Langkah {stepIndex} dari {TOUR_STEPS.length - 1}
              </span>
              <h3 className="text-xs font-extrabold text-[#14221C]">
                {currentStep.title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={finishTour}
            title="Lewati Panduan"
            className="p-1 rounded-full text-[#8E9691] hover:text-[#14221C] hover:bg-[#EFEFE8]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[#5C6660] leading-relaxed">
          {currentStep.description}
        </p>

        {currentStep.actionHint && (
          <div className="p-2.5 rounded-2xl bg-[#EAEFE4] border border-[#DAE3D2] text-[11px] text-[#113829] flex items-start gap-2">
            <MousePointerClick className="w-4 h-4 text-[#113829] shrink-0 mt-0.5" />
            <span className="font-semibold leading-snug">{currentStep.actionHint}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-1.5 border-t border-[#E6E5DD]">
          <div className="flex items-center gap-1">
            {TOUR_STEPS.slice(1).map((s, idx) => (
              <span
                key={s.id}
                className={`h-1.5 rounded-full transition-all ${
                  idx + 1 === stepIndex
                    ? 'w-4 bg-[#113829]'
                    : idx + 1 < stepIndex
                      ? 'w-1.5 bg-[#3D8B68]'
                      : 'w-1.5 bg-[#D6D9D1]'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            {stepIndex > 1 && (
              <button
                type="button"
                onClick={handlePrev}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold text-[#5C6660] hover:bg-[#EFEFE8]"
              >
                <ArrowLeft className="w-3 h-3" />
                Kembali
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-[11px] font-bold text-white bg-[#113829] hover:bg-[#0D2D20]"
            >
              {isLastStep ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#B8DEC4]" />
                  <span>Selesai</span>
                </>
              ) : (
                <>
                  <span>Lanjut</span>
                  <ArrowRight className="w-3 h-3" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
