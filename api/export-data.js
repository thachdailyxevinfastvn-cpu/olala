import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCZk2pmZaCxo2vgIyJFglrnXHIV9dnYpXk",
  authDomain: "mg-crm-26.firebaseapp.com",
  projectId: "mg-crm-26",
  storageBucket: "mg-crm-26.firebasestorage.app",
  messagingSenderId: "452894240468",
  appId: "1:452894240468:web:22b962acb7e99240951541"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default async function handler(req, res) {
  // Simple token authentication
  const { token } = req.query;
  if (token !== 'mgbd2026') {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }

  try {
    // 1. Get Customers
    const customersSnap = await getDocs(collection(db, 'customers'));
    const customers = [];
    customersSnap.forEach(doc => {
      customers.push({ id: doc.id, ...doc.data() });
    });

    // 2. Get Assigned Customers
    const assignedSnap = await getDocs(collection(db, 'assigned_customers'));
    const assignedCustomers = [];
    assignedSnap.forEach(doc => {
      assignedCustomers.push({ id: doc.id, ...doc.data() });
    });

    // 3. Get Calendar
    const calendarSnap = await getDocs(collection(db, 'calendar'));
    const calendar = [];
    calendarSnap.forEach(doc => {
      calendar.push({ id: doc.id, ...doc.data() });
    });

    // 4. Get Reports (Social BC)
    const reportsSnap = await getDocs(collection(db, 'reports'));
    const reports = [];
    reportsSnap.forEach(doc => {
      reports.push({ id: doc.id, ...doc.data() });
    });

    return res.status(200).json({
      status: 'success',
      data: {
        customers,
        assignedCustomers,
        calendar,
        reports
      }
    });
  } catch (error) {
    console.error("Export error:", error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
}
