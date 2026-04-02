import React, { useState, useEffect } from "react";

interface PhoneInputProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
}

const COUNTRY_CODES = [
    { code: "+256", flag: "🇺🇬", label: "Uganda" },
    { code: "+254", flag: "🇰🇪", label: "Kenya" },
    { code: "+255", flag: "🇹🇿", label: "Tanzania" },
    { code: "+250", flag: "🇷🇼", label: "Rwanda" },
    { code: "+234", flag: "🇳🇬", label: "Nigeria" },
    { code: "+27", flag: "🇿🇦", label: "South Africa" },
    { code: "+1", flag: "🇺🇸", label: "USA" },
    { code: "+44", flag: "🇬🇧", label: "UK" },
    { code: "+971", flag: "🇦🇪", label: "UAE" },
];

export function PhoneInput({ value, onChange, className = "" }: PhoneInputProps) {
    const [code, setCode] = useState("+256");
    const [number, setNumber] = useState("");

    // Parse initial value once locally or when value prop changes externally significantly
    useEffect(() => {
        if (!value) {
            setNumber("");
            return;
        }

        // Attempt to match existing code
        const matched = COUNTRY_CODES.find(c => value.startsWith(c.code));
        if (matched) {
            setCode(matched.code);
            setNumber(value.slice(matched.code.length).trim());
        } else {
            // Fallback: assume everything is the number if no code matches, or custom code
            setNumber(value);
        }
    }, [value]);

    const handleCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newCode = e.target.value;
        setCode(newCode);
        updateParent(newCode, number);
    };

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newNum = e.target.value.replace(/[^0-9]/g, ''); // Simple digit only filter
        setNumber(newNum);
        updateParent(code, newNum);
    };

    const updateParent = (c: string, n: string) => {
        if (!n) onChange("");
        else onChange(`${c} ${n}`);
    };

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <div className="relative">
                <select
                    className="appearance-none w-[5.5rem] border border-slate-200 dark:border-slate-700 rounded-lg pl-3 pr-6 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:border-slate-400 dark:focus:border-slate-600 outline-none transition-colors cursor-pointer"
                    value={code}
                    onChange={handleCodeChange}
                >
                    {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code}>
                            {c.flag} {c.code}
                        </option>
                    ))}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-xs text-slate-500">
                    ▼
                </div>
            </div>
            <input
                type="tel"
                className="flex-1 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:border-slate-400 dark:focus:border-slate-600 outline-none transition-colors"
                placeholder="700 000000"
                value={number}
                onChange={handleNumberChange}
            />
        </div>
    );
}
