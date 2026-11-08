import React, { useState, useMemo, useEffect } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import {
  Sun, Moon, Share2, Calculator, Scale, TrendingUp, MessageSquare,
  BarChart3, FileCheck, Plus, Trash2, Info, ArrowRightLeft, Sparkles,
  IndianRupee, ChevronDown
} from 'lucide-react';

/* ============================================================
   CONSTANTS — FY 2025-26 (AY 2026-27) INDIA TAX DATA
   ============================================================ */
const NEW_REGIME_SLABS = [
  { upTo: 400000, rate: 0 },
  { upTo: 800000, rate: 0.05 },
  { upTo: 1200000, rate: 0.10 },
  { upTo: 1600000, rate: 0.15 },
  { upTo: 2000000, rate: 0.20 },
  { upTo: 2400000, rate: 0.25 },
  { upTo: Infinity, rate: 0.30 },
];

const OLD_REGIME_SLABS = [
  { upTo: 250000, rate: 0 },
  { upTo: 500000, rate: 0.05 },
  { upTo: 1000000, rate: 0.20 },
  { upTo: Infinity, rate: 0.30 },
];

const PT_STATES = [
  'Maharashtra', 'Karnataka', 'West Bengal', 'Tamil Nadu',
  'Andhra Pradesh', 'Telangana', 'Gujarat', 'Madhya Pradesh',
  'Delhi', 'Uttar Pradesh', 'Haryana', 'Rajasthan', 'Punjab',
  'Uttarakhand', 'Himachal Pradesh', 'Goa', 'Other'
];

const BENCHMARK_DATA = {
  'Software Engineer': {
    '0-2': [600000, 1200000, 1800000],
    '2-5': [1200000, 2000000, 3500000],
    '5-8': [2500000, 4000000, 6000000],
    '8+': [5000000, 8000000, 12000000],
  },
  'Data Scientist': {
    '0-2': [800000, 1400000, 2200000],
    '2-5': [1500000, 2500000, 4500000],
    '5-8': [3500000, 5500000, 8000000],
    '8+': [7000000, 11000000, 18000000],
  },
  'Product Manager': {
    '0-2': [1000000, 1600000, 2400000],
    '2-5': [1800000, 3000000, 5000000],
    '5-8': [4000000, 6500000, 9000000],
    '8+': [8000000, 13000000, 20000000],
  },
  'UX Designer': {
    '0-2': [500000, 900000, 1500000],
    '2-5': [1000000, 1600000, 2800000],
    '5-8': [2000000, 3200000, 5000000],
    '8+': [4000000, 6000000, 9000000],
  },
  'Sales Manager': {
    '0-2': [500000, 800000, 1200000],
    '2-5': [1000000, 1500000, 2500000],
    '5-8': [2000000, 3000000, 5000000],
    '8+': [4000000, 6500000, 10000000],
  },
};

const CITY_MULTIPLIER = {
  'Metro (Delhi, Mumbai, Bangalore, Hyderabad, Chennai, Pune, Kolkata)': 1.2,
  'Tier-1 (Ahmedabad, Jaipur, Kochi, Chandigarh)': 1.0,
  'Tier-2 (Indore, Bhopal, Lucknow, Nagpur)': 0.8,
  'Remote': 0.95,
};

/* ============================================================
   HELPER FUNCTIONS
   ============================================================ */
const fmt = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(Math.round(n || 0));

const fmtShort = (n) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
};

function calcSlabTax(income, slabs) {
  let tax = 0;
  let prev = 0;
  for (const slab of slabs) {
    if (income > prev) {
      const taxable = Math.min(income, slab.upTo) - prev;
      tax += taxable * slab.rate;
      prev = slab.upTo;
    } else break;
  }
  return tax;
}

function calcTax(taxableIncome, regime) {
  let tax = 0;
  const slabs = regime === 'new' ? NEW_REGIME_SLABS : OLD_REGIME_SLABS;
  tax = calcSlabTax(taxableIncome, slabs);

  // Rebate 87A
  if (regime === 'new') {
    if (taxableIncome <= 1200000) {
      tax = Math.max(0, tax - 60000);
    } else if (taxableIncome <= 1275000) {
      const excess = taxableIncome - 1200000;
      const taxAt12L = calcSlabTax(1200000, NEW_REGIME_SLABS);
      const rebate = Math.min(tax, 60000);
      tax = tax - rebate;
      if (tax > excess) tax = excess;
    }
  } else {
    if (taxableIncome <= 500000) {
      tax = Math.max(0, tax - 12500);
    }
  }

  // Surcharge
  let surRate = 0;
  if (taxableIncome > 5000000) surRate = 0.10;
  if (taxableIncome > 10000000) surRate = 0.15;
  if (taxableIncome > 20000000) surRate = 0.25;
  if (regime === 'old' && taxableIncome > 50000000) surRate = 0.37;
  tax += tax * surRate;

  // Cess
  tax += tax * 0.04;
  return Math.round(tax);
}

function calcProfessionalTax(monthlyGross, state, gender) {
  if (state === 'Maharashtra') {
    if (gender === 'female' && monthlyGross <= 25000) return 0;
    if (monthlyGross <= 7500) return 0;
    if (monthlyGross <= 10000) return 175;
    return 200;
  }
  if (state === 'Karnataka') {
    if (monthlyGross <= 25000) return 0;
    return 200;
  }
  if (state === 'West Bengal') {
    if (monthlyGross <= 10000) return 0;
    if (monthlyGross <= 15000) return 110;
    if (monthlyGross <= 25000) return 130;
    return 200;
  }
  if (state === 'Tamil Nadu') {
    if (monthlyGross <= 21000) return 0;
    if (monthlyGross <= 30000) return 135;
    if (monthlyGross <= 45000) return 315;
    if (monthlyGross <= 60000) return 690;
    if (monthlyGross <= 75000) return 1025;
    return 1250;
  }
  if (state === 'Andhra Pradesh' || state === 'Telangana') {
    if (monthlyGross <= 15000) return 0;
    if (monthlyGross <= 20000) return 150;
    return 200;
  }
  if (state === 'Gujarat') {
    if (monthlyGross <= 12000) return 0;
    return 200;
  }
  if (state === 'Madhya Pradesh') {
    if (monthlyGross <= 18750) return 0;
    return 208;
  }
  return 0;
}

/**
 * Core salary calculation engine.
 */
function calculateSalary(ctc, opts) {
  const {
    basicPercent = 40,
    hraPercent = 50,
    city = 'Metro (Delhi, Mumbai, Bangalore, Hyderabad, Chennai, Pune, Kolkata)',
    rent = 0, // monthly rent
    regime = 'new',
    professionalTaxState = 'Maharashtra',
    gender = 'male',
    extra80C = 0,
    extra80D = 0,
    nps = 0,
    homeLoanInterest = 0,
  } = opts;

  const basic = ctc * (basicPercent / 100);
  const hra = basic * (hraPercent / 100);
  const employerPF = basic * 0.12;
  const gratuity = basic * 0.0481;
  const gross = ctc - employerPF - gratuity;
  const specialAllowance = Math.max(0, gross - basic - hra);
  const employeePF = basic * 0.12;

  const monthlyGross = gross / 12;
  const professionalTax = calcProfessionalTax(monthlyGross, professionalTaxState, gender);

  let taxableIncome;
  let hraExemption = 0;

  if (regime === 'old') {
    if (rent > 0) {
      const metroCities = ['Delhi', 'Mumbai', 'Kolkata', 'Chennai'];
      const isMetro = metroCities.some((c) => city.includes(c)) ||
        city.includes('Metro') || city.includes('Bangalore') ||
        city.includes('Hyderabad') || city.includes('Pune');
      const hraPercentLimit = isMetro ? 0.5 : 0.4;
      const annualRent = rent * 12;
      hraExemption = Math.min(
        hra,
        Math.max(0, annualRent - 0.1 * basic),
        hraPercentLimit * basic
      );
    }
    const stdDeduction = 50000;
    const total80C = Math.min(150000, employeePF + extra80C);
    const total80D = Math.min(50000, extra80D);
    const totalNPS = Math.min(50000, nps);
    const homeLoan = Math.min(200000, homeLoanInterest);
    taxableIncome = gross - stdDeduction - hraExemption - total80C - total80D - totalNPS - homeLoan;
  } else {
    const stdDeduction = 75000;
    taxableIncome = gross - stdDeduction;
  }
  taxableIncome = Math.max(0, taxableIncome);

  const tax = calcTax(taxableIncome, regime);
  const annualInHand = gross - employeePF - professionalTax - tax;
  const monthlyInHand = annualInHand / 12;

  return {
    ctc,
    basic,
    hra,
    specialAllowance,
    employerPF,
    gratuity,
    gross,
    employeePF,
    professionalTax,
    tax,
    annualInHand,
    monthlyInHand,
    taxableIncome,
    hraExemption,
    breakdown: [
      { name: 'Basic', value: Math.round(basic) },
      { name: 'HRA', value: Math.round(hra) },
      { name: 'Special Allowance', value: Math.round(specialAllowance) },
      { name: 'Employer PF', value: Math.round(employerPF) },
      { name: 'Gratuity', value: Math.round(gratuity) },
    ],
    deductions: [
      { name: 'Employee PF', value: Math.round(employeePF) },
      { name: 'Professional Tax', value: Math.round(professionalTax) },
      { name: 'Income Tax', value: Math.round(tax) },
    ],
  };
}

/* ============================================================
   MAIN APP COMPONENT
   ============================================================ */
export default function App() {
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sm-dark') === 'true' ||
        window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  const [activeTab, setActiveTab] = useState('calculator');
  const [toast, setToast] = useState('');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('sm-dark', dark);
  }, [dark]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const tabs = [
    { id: 'calculator', label: 'Calculator', icon: Calculator },
    { id: 'offers', label: 'Offers', icon: Scale },
    { id: 'hike', label: 'Hike', icon: TrendingUp },
    { id: 'negotiate', label: 'Negotiate', icon: MessageSquare },
    { id: 'benchmark', label: 'Benchmark', icon: BarChart3 },
    { id: 'payslip', label: 'Payslip', icon: FileCheck },
  ];

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
              <Sparkles size={20} />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight">Salary Masterpiece</h1>
              <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                India Salary Intelligence · FY 2025-26
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDark(!dark)}
              className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Toggle theme"
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="mx-auto max-w-6xl overflow-x-auto px-4 no-scrollbar">
        <div className="flex gap-1 py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition-all ${
                  active
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-4 py-4">
        {activeTab === 'calculator' && <CalculatorTab showToast={showToast} />}
        {activeTab === 'offers' && <OffersTab showToast={showToast} />}
        {activeTab === 'hike' && <HikeTab showToast={showToast} />}
        {activeTab === 'negotiate' && <NegotiateTab showToast={showToast} />}
        {activeTab === 'benchmark' && <BenchmarkTab />}
        {activeTab === 'payslip' && <PayslipTab showToast={showToast} />}
      </main>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-2xl dark:bg-white dark:text-slate-900">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   TAB 1 — SALARY CALCULATOR
   ============================================================ */
function CalculatorTab({ showToast }) {
  const [ctc, setCtc] = useState(1500000);
  const [basicPercent, setBasicPercent] = useState(40);
  const [hraPercent, setHraPercent] = useState(50);
  const [city, setCity] = useState('Metro (Delhi, Mumbai, Bangalore, Hyderabad, Chennai, Pune, Kolkata)');
  const [rent, setRent] = useState(25000);
  const [regime, setRegime] = useState('new');
  const [ptState, setPtState] = useState('Maharashtra');
  const [gender, setGender] = useState('male');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [extra80C, setExtra80C] = useState(0);
  const [extra80D, setExtra80D] = useState(0);
  const [nps, setNps] = useState(0);
  const [homeLoan, setHomeLoan] = useState(0);

  const result = useMemo(
    () => calculateSalary(ctc, {
      basicPercent, hraPercent, city, rent, regime,
      professionalTaxState: ptState, gender,
      extra80C, extra80D, nps, homeLoanInterest: homeLoan,
    }),
    [ctc, basicPercent, hraPercent, city, rent, regime, ptState, gender, extra80C, extra80D, nps, homeLoan]
  );

  const copySummary = () => {
    const text = `💰 Salary Masterpiece — CTC ${fmtShort(result.ctc)}
────────────────────
Take-home (Monthly): ${fmt(result.monthlyInHand)}
Take-home (Annual): ${fmt(result.annualInHand)}

Tax Regime: ${regime === 'new' ? 'New' : 'Old'}
Taxable Income: ${fmtShort(result.taxableIncome)}
Income Tax: ${fmt(result.tax)}

Breakdown:
• Basic: ${fmtShort(result.basic)}
• HRA: ${fmtShort(result.hra)}
• Special Allowance: ${fmtShort(result.specialAllowance)}
• Employer PF: ${fmtShort(result.employerPF)}
• Gratuity: ${fmtShort(result.gratuity)}

Deductions:
• Employee PF: ${fmtShort(result.employeePF)}
• Professional Tax: ${fmt(result.professionalTax)}
• TDS: ${fmt(result.tax)}

Calculated with Salary Masterpiece`;
    navigator.clipboard.writeText(text);
    showToast('Summary copied to clipboard!');
  };

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      {/* LEFT — INPUTS */}
      <div className="space-y-3 lg:col-span-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold">
            <Calculator size={18} className="text-indigo-500" />
            Your Salary Inputs
          </h2>

          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
            Annual CTC (₹)
          </label>
          <input
            type="number"
            value={ctc}
            onChange={(e) => setCtc(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-lg font-bold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800"
          />
          <p className="mt-1 text-xs text-slate-400">{fmtShort(ctc)}</p>

          <div className="mt-4">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>Basic Salary</span>
              <span>{basicPercent}% of CTC</span>
            </div>
            <input
              type="range" min="30" max="60" value={basicPercent}
              onChange={(e) => setBasicPercent(Number(e.target.value))}
              className="mt-1 w-full accent-indigo-600"
            />
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>HRA</span>
              <span>{hraPercent}% of Basic</span>
            </div>
            <input
              type="range" min="30" max="60" value={hraPercent}
              onChange={(e) => setHraPercent(Number(e.target.value))}
              className="mt-1 w-full accent-indigo-600"
            />
          </div>

          <div className="mt-3">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              City Category
            </label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800"
            >
              {Object.keys(CITY_MULTIPLIER).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Monthly Rent (₹)
              </label>
              <input
                type="number" value={rent}
                onChange={(e) => setRent(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Professional Tax State
              </label>
              <select
                value={ptState}
                onChange={(e) => setPtState(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800"
              >
                {PT_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="mt-3">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Tax Regime
            </label>
            <div className="mt-1 flex gap-2">
              {['new', 'old'].map((r) => (
                <button
                  key={r}
                  onClick={() => setRegime(r)}
                  className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    regime === r
                      ? 'bg-indigo-600 text-white shadow'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {r === 'new' ? 'New Regime' : 'Old Regime'}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Gender
            </label>
            <div className="mt-1 flex gap-2">
              {['male', 'female'].map((g) => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold capitalize transition ${
                    gender === g
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {regime === 'old' && (
            <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex w-full items-center justify-between text-sm font-semibold text-indigo-600 dark:text-indigo-400"
              >
                Tax Saving Deductions
                <ChevronDown size={16} className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              </button>
              {showAdvanced && (
                <div className="mt-3 space-y-2">
                  {[
                    { label: '80C (LIC, ELSS, etc.)', value: extra80C, set: setExtra80C, max: 150000 },
                    { label: '80D (Health Insurance)', value: extra80D, set: setExtra80D, max: 50000 },
                    { label: 'NPS 80CCD(1B)', value: nps, set: setNps, max: 50000 },
                    { label: 'Home Loan Interest (24b)', value: homeLoan, set: setHomeLoan, max: 200000 },
                  ].map((item) => (
                    <div key={item.label}>
                      <label className="text-xs text-slate-500 dark:text-slate-400">
                        {item.label} (max {fmtShort(item.max)})
                      </label>
                      <input
                        type="number"
                        value={item.value}
                        onChange={(e) => item.set(Number(e.target.value))}
                        className="mt-0.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT — RESULTS */}
      <div className="space-y-3 lg:col-span-3">
        {/* Big In-Hand Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-5 text-white shadow-xl">
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <p className="text-sm font-medium text-white/80">Your Monthly Take-Home</p>
          <p className="mt-1 text-4xl font-extrabold tracking-tight sm:text-5xl">
            {fmt(result.monthlyInHand)}
          </p>
          <p className="mt-1 text-sm text-white/80">
            {fmt(result.annualInHand)} per year
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <div className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur">
              CTC {fmtShort(result.ctc)}
            </div>
            <div className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur">
              Tax {fmtShort(result.tax)}
            </div>
            <button
              onClick={copySummary}
              className="ml-auto flex items-center gap-1 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold backdrop-blur transition hover:bg-white/30"
            >
              <Share2 size={14} /> Share
            </button>
          </div>
        </div>

        {/* Breakdown Charts */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-2 text-sm font-bold">CTC Breakdown</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={result.breakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%" cy="50%"
                    innerRadius={45} outerRadius={70}
                    paddingAngle={2}
                  >
                    {result.breakdown.map((_, i) => (
                      <Cell key={i} fill={['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'][i % 5]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => fmtShort(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-2 text-sm font-bold">Monthly Deductions</h3>
            <div className="space-y-2">
              {result.deductions.map((d) => (
                <div key={d.name} className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400">{d.name}</span>
                  <span className="text-sm font-bold">{fmt(d.value / 12)}/mo</span>
                </div>
              ))}
              <div className="border-t border-slate-200 pt-2 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">Total Deductions</span>
                  <span className="text-sm font-extrabold text-red-500">
                    {fmt((result.employeePF + result.professionalTax + result.tax) / 12)}/mo
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Table */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 text-sm font-bold">Full Annual Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700">
                  <th className="pb-2 font-semibold">Component</th>
                  <th className="pb-2 text-right font-semibold">Annual</th>
                  <th className="pb-2 text-right font-semibold">Monthly</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {[
                  ['Basic Salary', result.basic],
                  ['HRA', result.hra],
                  ['Special Allowance', result.specialAllowance],
                  ['Employer PF', result.employerPF],
                  ['Gratuity', result.gratuity],
                ].map(([label, val]) => (
                  <tr key={label}>
                    <td className="py-1.5 text-slate-600 dark:text-slate-300">{label}</td>
                    <td className="py-1.5 text-right font-semibold">{fmt(val)}</td>
                    <td className="py-1.5 text-right text-slate-500">{fmt(val / 12)}</td>
                  </tr>
                ))}
                <tr className="bg-indigo-50/50 dark:bg-indigo-950/30">
                  <td className="py-2 font-bold text-indigo-700 dark:text-indigo-300">Gross Salary</td>
                  <td className="py-2 text-right font-bold">{fmt(result.gross)}</td>
                  <td className="py-2 text-right font-bold">{fmt(result.gross / 12)}</td>
                </tr>
                <tr>
                  <td className="py-1.5 text-slate-600 dark:text-slate-300">Employee PF</td>
                  <td className="py-1.5 text-right font-semibold text-red-500">-{fmt(result.employeePF)}</td>
                  <td className="py-1.5 text-right text-slate-500">-{fmt(result.employeePF / 12)}</td>
                </tr>
                <tr>
                  <td className="py-1.5 text-slate-600 dark:text-slate-300">Professional Tax</td>
                  <td className="py-1.5 text-right font-semibold text-red-500">-{fmt(result.professionalTax)}</td>
                  <td className="py-1.5 text-right text-slate-500">-{fmt(result.professionalTax / 12)}</td>
                </tr>
                <tr>
                  <td className="py-1.5 text-slate-600 dark:text-slate-300">Income Tax (TDS)</td>
                  <td className="py-1.5 text-right font-semibold text-red-500">-{fmt(result.tax)}</td>
                  <td className="py-1.5 text-right text-slate-500">-{fmt(result.tax / 12)}</td>
                </tr>
                <tr className="bg-emerald-50/50 dark:bg-emerald-950/30">
                  <td className="py-2 font-bold text-emerald-700 dark:text-emerald-300">Take-Home</td>
                  <td className="py-2 text-right font-extrabold">{fmt(result.annualInHand)}</td>
                  <td className="py-2 text-right font-extrabold">{fmt(result.monthlyInHand)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <Info size={14} className="mt-0.5 shrink-0" />
          <p>
            Calculations use FY 2025-26 slabs. Employer PF and gratuity are assumed part of CTC.
            Actual structure may vary by company. Verify with your HR before making decisions.
          </p>
        </div>
      </div>
    </div>
  );
}
