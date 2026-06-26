export type ExpenseCategory =
  | "food"
  | "transport"
  | "rent"
  | "utilities"
  | "entertainment"
  | "groceries"
  | "shopping"
  | "health"
  | "other";

export type PaymentProvider = "eSewa" | "Bank";

export interface PaymentQR {
  provider: PaymentProvider;
  name: string;
  qrImage?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  avatarImage?: string;
  paymentQR?: PaymentQR;
  monthlyBudget: number;
  phone?: string;
  initials?: string;
}

export interface Group {
  id: string;
  name: string;
  avatarColor: string;
  avatarImage?: string;
  inviteCode: string;
  leaderId: string;
  memberIds: string[];
  targetDayOfMonth?: number;
  targetDate?: string;
  paymentQR?: PaymentQR;
  createdAt: string;
  memberCount?: number;
  lastUpdated?: string;
  statusText?: string;
  balance?: number;
}

export interface ExpenseSplit {
  userId: string;
  amount: number;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  paidById: string;
  groupId?: string;
  splitType: "equal" | "amount" | "percentage";
  splits: ExpenseSplit[];
  createdAt: string;
  title?: string;
  type?: "expense" | "income";
  notes?: string;
}

export type Category = ExpenseCategory;

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: "income" | "expense";
  category: Category;
  date: string;
  groupId?: string;
  splitWith?: string[];
  notes?: string;
}

export interface GroupExpense {
  id: string;
  groupId: string;
  title: string;
  amount: number;
  category: Category;
  date: string;
  addedBy: string;
  addedByName: string;
  addedByInitials: string;
  addedByColor: string;
  addedAt: string;
  notes?: string;
}

export interface FundCycle {
  id: string;
  name: string;
  totalRounds: number;
  currentRound: number;
  contributionAmount: number;
  nextPayoutDate: string;
  nextRecipient: string;
}

export interface ExpenseFeedDay {
  date: string;
  expenses: GroupExpense[];
}
