
export type ScheduleSegment = {
    label: string;
    start: number;
    end: number;
};

export type Deliverable = {
    id: number;
    label: string;
    due: string;
    done: boolean;
};

export type TimelineEvent = {
    date: string;
    label: string;
};

export type Contract = {
    id: string;
    brand: string;
    campaign: string;
    period: string;
    status: string;
    value: number;
    currency: string;
    remainingTasks: number;
    totalTasks: number;
    payoutStatus: string;
    health: string;
    healthScore: number;
    schedule: ScheduleSegment[];
    deliverables: Deliverable[];
    timeline: TimelineEvent[];
};

export const CONTRACTS: Contract[] = [
    {
        id: "C-101",
        brand: "GlowUp Hub",
        campaign: "Autumn Beauty Flash",
        period: "1–30 Nov 2025",
        status: "Active",
        value: 1400,
        currency: "USD",
        remainingTasks: 3,
        totalTasks: 8,
        payoutStatus: "50% paid · Next in 3 days",
        health: "On track",
        healthScore: 82,
        schedule: [
            { label: "Prep", start: 0, end: 20 },
            { label: "Live", start: 40, end: 50 },
            { label: "Clips", start: 55, end: 75 },
            { label: "Reporting", start: 80, end: 100 }
        ],
        deliverables: [
            { id: 1, label: "Beauty Flash live session", due: "15 Nov", done: true },
            { id: 2, label: "3x Shoppable Adz clips", due: "18 Nov", done: false },
            { id: 3, label: "Performance report", due: "21 Nov", done: false },
            { id: 4, label: "Aftercare Q&A live", due: "28 Nov", done: false }
        ],
        timeline: [
            { date: "01 Nov", label: "Contract signed" },
            { date: "05 Nov", label: "Kickoff call & brief" },
            { date: "15 Nov", label: "Main live session" },
            { date: "18 Nov", label: "Clips delivery window" }
        ]
    },
    {
        id: "C-102",
        brand: "GadgetMart Africa",
        campaign: "Q4 Tech Friday Series",
        period: "15 Nov – 31 Dec 2025",
        status: "Upcoming",
        value: 3200,
        currency: "USD",
        remainingTasks: 5,
        totalTasks: 10,
        payoutStatus: "0% paid · Starts in 5 days",
        health: "At risk",
        healthScore: 64,
        schedule: [
            { label: "Series 1", start: 10, end: 25 },
            { label: "Series 2", start: 40, end: 55 },
            { label: "Series 3", start: 70, end: 85 }
        ],
        deliverables: [
            { id: 1, label: "Tech Friday Live – Part 1", due: "22 Nov", done: false },
            { id: 2, label: "Tech Friday Live – Part 2", due: "06 Dec", done: false },
            { id: 3, label: "Tech Friday Live – Part 3", due: "20 Dec", done: false },
            { id: 4, label: "Highlight clips for each session", due: "22 Dec", done: false },
            { id: 5, label: "End-of-series recap", due: "30 Dec", done: false }
        ],
        timeline: [
            { date: "05 Nov", label: "Contract drafted" },
            { date: "10 Nov", label: "Negotiation in progress" },
            { date: "15 Nov", label: "Series kickoff" }
        ]
    },
    {
        id: "C-103",
        brand: "Grace Living Store",
        campaign: "Faith & Wellness Morning Dealz",
        period: "1–31 Oct 2025",
        status: "Completed",
        value: 900,
        currency: "USD",
        remainingTasks: 0,
        totalTasks: 6,
        payoutStatus: "100% paid",
        health: "Completed",
        healthScore: 95,
        schedule: [
            { label: "Lives", start: 10, end: 60 },
            { label: "Reporting", start: 70, end: 90 }
        ],
        deliverables: [
            { id: 1, label: "4x Morning live sessionz", due: "Weekly", done: true },
            { id: 2, label: "Summary report", due: "01 Nov", done: true }
        ],
        timeline: [
            { date: "01 Oct", label: "Contract signed" },
            { date: "07 Oct", label: "Live 1" },
            { date: "14 Oct", label: "Live 2" },
            { date: "21 Oct", label: "Live 3" },
            { date: "28 Oct", label: "Live 4" },
            { date: "01 Nov", label: "Final report & payout" }
        ]
    },
    {
        id: "C-104",
        brand: "ShopNow Foods",
        campaign: "Groceries Flash Dealz",
        period: "15–20 Oct 2025",
        status: "Terminated",
        value: 500,
        currency: "USD",
        remainingTasks: 0,
        totalTasks: 3,
        payoutStatus: "50% kill fee paid",
        health: "Terminated",
        healthScore: 20,
        schedule: [
            { label: "Planning", start: 0, end: 20 },
            { label: "Cancelled", start: 50, end: 50 }
        ],
        deliverables: [
            { id: 1, label: "Promo live session", due: "18 Oct", done: false },
            { id: 2, label: "2x Promo clips", due: "19 Oct", done: false },
            { id: 3, label: "Performance summary", due: "20 Oct", done: false }
        ],
        timeline: [
            { date: "10 Oct", label: "Contract signed" },
            { date: "14 Oct", label: "Campaign cancelled by brand" },
            { date: "16 Oct", label: "Kill fee processed" }
        ]
    }
];
