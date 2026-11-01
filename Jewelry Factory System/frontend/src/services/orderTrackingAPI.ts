import { fetchWithAuth } from '../utils/fetchWithAuth';

export interface OrderInfo {
    CustCode: string;
    OrdDate: string;
    DueDate: string;
    PONo: string;
    ProFac?: string | null;
    ItemNo: string;
    ItemMat: string;
    ItemCust: string;
    ItemDesc: string;
    ItemStone: string;
    ItemPlate: string;
    ItemSize: string;
    ItemQty: number;
    OrdLineNo?: string | number;
}

export interface TrackingStep {
    stepIndex: number;
    prefix: string;
    deptCode: string;
    nameEN: string;
    nameTH: string;
    status: number; // 0 = Wait, 1 = In Progress (ส้ม), 2 = Done (เขียว)
    recQty: number;
    senQty: number;
    balance: number;
    docNo: string;
    repDate: string | null;
}

export interface TrackingSummary {
    totalSteps: number;
    doneSteps: number;
    inProgressCount: number;
    currentStepName: string;
    percent: number;
}

export interface OrderTrackingResponse {
    orderInfo: OrderInfo;
    steps: TrackingStep[];
    history: TrackingStep[];
    summary: TrackingSummary;
}

/**
 * Searchข้อมูลติดตามStatusOrderในสายการผลิต 17 Step
 */
export const getOrderTracking = async (
    ordNo: string,
    ordLineNo?: string
): Promise<OrderTrackingResponse> => {
    const params = new URLSearchParams({ ordNo });
    if (ordLineNo) params.append('ordLineNo', ordLineNo);

    const res = await fetchWithAuth(`/api/order-tracking/track?${params.toString()}`);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP error ${res.status}`);
    }
    return res.json();
};

export interface OrderSuggestion {
    OrdNo: string;
    OrdLineNo: number | string;
    ItemNo: string;
    CustCode: string;
    ItemDesc?: string;
    ProFac?: string | null;
}

/**
 * Autocomplete search for matching orders in FBE (100% Read-Only)
 */
export const getOrderSuggestions = async (q: string): Promise<OrderSuggestion[]> => {
    if (!q || q.trim().length < 2) return [];
    const params = new URLSearchParams({ q: q.trim() });

    try {
        const res = await fetchWithAuth(`/api/order-tracking/suggest?${params.toString()}`);
        if (!res.ok) return [];
        const data = await res.json().catch(() => ({}));
        return (data.suggestions || []) as OrderSuggestion[];
    } catch {
        return [];
    }
};
