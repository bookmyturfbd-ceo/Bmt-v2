'use client';
import { useState, useEffect, useMemo } from 'react';
import { getCookie } from '@/lib/cookies';
import {
  Loader2, Package, MapPin, Phone, Banknote, User, CheckCircle2, XCircle,
  ChevronDown, ChevronUp, TrendingUp, Calendar, ChevronLeft, ChevronRight,
  Clock, Truck, ShoppingBag, Mail, FolderOpen, Tag, ArrowLeft, ListFilter,
  PieChart, Search, X
} from 'lucide-react';
import { sortSizes } from '@/lib/sizeSorter';

const STATUS_STYLES: Record<string, string> = {
  new:        'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  ready:      'bg-blue-500/20 text-blue-400 border-blue-500/30',
  on_the_way: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  delivered:  'bg-accent/20 text-accent border-accent/30',
  canceled:   'bg-red-500/20 text-red-400 border-red-500/30',
  exchange:   'bg-orange-500/20 text-orange-400 border-orange-500/30',
  returned:   'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  no_answer:  'bg-pink-500/20 text-pink-400 border-pink-500/30',
};

const TRANSITIONS: Record<string, { label: string; status: string; style: string }[]> = {
  new: [
    { label: 'Start Preparing 👨‍🍳', status: 'ready', style: 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20' },
    { label: 'No Answer 📞', status: 'no_answer', style: 'bg-pink-500/10 border-pink-500/20 text-pink-400 hover:bg-pink-500/20' },
    { label: 'Cancel ❌', status: 'canceled', style: 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20' }
  ],
  ready: [
    { label: 'Dispatch 🚚', status: 'on_the_way', style: 'bg-purple-500/10 border-purple-500/20 text-purple-400 hover:bg-purple-500/20' },
    { label: 'No Answer 📞', status: 'no_answer', style: 'bg-pink-500/10 border-pink-500/20 text-pink-400 hover:bg-pink-500/20' },
    { label: 'Cancel ❌', status: 'canceled', style: 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20' }
  ],
  on_the_way: [
    { label: 'Mark Delivered ✅', status: 'delivered', style: 'bg-accent/10 border-accent/20 text-accent hover:bg-accent/20' },
    { label: 'No Answer 📞', status: 'no_answer', style: 'bg-pink-500/10 border-pink-500/20 text-pink-400 hover:bg-pink-500/20' },
    { label: 'Cancel ❌', status: 'canceled', style: 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20' }
  ],
  no_answer: [
    { label: 'Back to New 🛍️', status: 'new', style: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20' },
    { label: 'Start Preparing 👨‍🍳', status: 'ready', style: 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20' },
    { label: 'Cancel ❌', status: 'canceled', style: 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20' }
  ],
  delivered: [
    { label: 'Exchange Requested 🔄', status: 'exchange', style: 'bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500/20' },
    { label: 'Returned ↩️', status: 'returned', style: 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400 hover:bg-zinc-500/20' }
  ]
};

const DHAKA_METRO = ["Dhaka (Metropolitan)"];
const DHAKA_SUBURBS = ["Dhaka (Suburbs - Savar, Keraniganj, etc)", "Gazipur", "Narayanganj"];
const OTHERS = [
  "Bagerhat", "Bandarban", "Barguna", "Barishal", "Bhola", "Bogura", "Brahmanbaria", 
  "Chandpur", "Chattogram", "Chuadanga", "Cox's Bazar", "Cumilla", "Dinajpur", "Faridpur", "Feni", "Gaibandha", 
  "Gopalganj", "Habiganj", "Jamalpur", "Jashore", "Jhalokati", "Jhenaidah", 
  "Joypurhat", "Khagrachhari", "Khulna", "Kishoreganj", "Kurigram", "Kushtia", "Lakshmipur", 
  "Lalmonirhat", "Madaripur", "Magura", "Manikganj", "Meherpur", "Moulvibazar", "Munshiganj", 
  "Mymensingh", "Naogaon", "Narail", "Narsingdi", "Natore", "Netrokona", 
  "Nilphamari", "Noakhali", "Pabna", "Panchagarh", "Patuakhali", "Pirojpur", "Rajbari", 
  "Rajshahi", "Rangamati", "Rangpur", "Satkhira", "Shariatpur", "Sherpur", "Sirajganj", 
  "Sunamganj", "Sylhet", "Tangail", "Thakurgaon"
].sort();
const BD_DISTRICTS = [...DHAKA_METRO, ...DHAKA_SUBURBS, ...OTHERS];

function getBaseDeliveryCharge(district: string): number {
  if (DHAKA_METRO.includes(district)) return 80;
  if (DHAKA_SUBURBS.includes(district)) return 120;
  return 150;
}

export default function ShopOrdersPanel() {
  const [orders, setOrders] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    setRole(getCookie('bmt_role'));
  }, []);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [historyDayOffset, setHistoryDayOffset] = useState(0); // 0=today, 1=yesterday, etc.
  const [activeTab, setActiveTab] = useState<'list' | 'ratio'>('list');
  const [selectedParentCategoryId, setSelectedParentCategoryId] = useState<string | null>(null);
  const [categoryViewTab, setCategoryViewTab] = useState<'products' | 'demographics'>('products');
  const [ratioStatusFilter, setRatioStatusFilter] = useState<string>('active'); // active = new + ready
  const [filterDate, setFilterDate] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

  // Real-time discount evaluation inside order edit form
  const [evaluatedEditCart, setEvaluatedEditCart] = useState<any>(null);
  const [evaluatingEditCart, setEvaluatingEditCart] = useState(false);

  // Interactive selector modal states
  const [selectorItemIndex, setSelectorItemIndex] = useState<number | 'new' | null>(null);
  const [selectorParentId, setSelectorParentId] = useState<string | null>(null);
  const [selectorSubId, setSelectorSubId] = useState<string | null>(null);
  const [selectorProductId, setSelectorProductId] = useState<string | null>(null);
  const [selectorSize, setSelectorSize] = useState<string | null>(null);
  const [selectorQuantity, setSelectorQuantity] = useState<number>(1);

  // Real-time discount evaluation hook
  useEffect(() => {
    if (!editForm || !editForm.items || editForm.items.length === 0) {
      setEvaluatedEditCart(null);
      return;
    }

    const evaluateCart = async () => {
      setEvaluatingEditCart(true);
      try {
        const deliveryCharge = getBaseDeliveryCharge(editForm.district);
        const res = await fetch('/api/shop/discounts/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: editForm.items.map((i: any) => ({
              productId: i.productId,
              sizeLabel: i.sizeLabel,
              quantity: i.quantity
            })),
            deliveryCharge
          })
        });
        if (res.ok) {
          const result = await res.json();
          setEvaluatedEditCart(result);
        }
      } catch (err) {
        console.error('Error evaluating edit cart discounts', err);
      } finally {
        setEvaluatingEditCart(false);
      }
    };

    const timer = setTimeout(evaluateCart, 300);
    return () => clearTimeout(timer);
  }, [editForm?.items, editForm?.district]);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [ordersData, categoriesData, productsData] = await Promise.all([
        fetch(`/api/shop/orders?t=${Date.now()}`).then(r => r.json()),
        fetch(`/api/shop/categories?t=${Date.now()}`).then(r => r.json()),
        fetch(`/api/shop/products?t=${Date.now()}`).then(r => r.json())
      ]);
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setAllProducts(Array.isArray(productsData) ? productsData : []);
    } catch (err) {
      console.error('Failed to load shop order panel data', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const openSelectorFlow = (index: number | 'new') => {
    setSelectorItemIndex(index);
    if (index === 'new') {
      setSelectorParentId(null);
      setSelectorSubId(null);
      setSelectorProductId(null);
      setSelectorSize(null);
      setSelectorQuantity(1);
    } else {
      const item = editForm.items[index];
      const product = allProducts.find(p => p.id === item.productId);
      const category = categories.find(c => c.id === product?.categoryId);
      
      setSelectorProductId(item.productId);
      setSelectorSize(item.sizeLabel);
      setSelectorQuantity(item.quantity);

      if (category) {
        if (category.parentId) {
          setSelectorParentId(category.parentId);
          setSelectorSubId(category.id);
        } else {
          setSelectorParentId(category.id);
          setSelectorSubId('direct');
        }
      } else {
        setSelectorParentId(null);
        setSelectorSubId(null);
      }
    }
  };

  const confirmSelectorSelection = () => {
    if (!selectorProductId || !selectorSize || !editForm || selectorItemIndex === null) return;

    const updatedItems = [...editForm.items];
    const newItem = {
      productId: selectorProductId,
      sizeLabel: selectorSize,
      quantity: selectorQuantity
    };

    if (selectorItemIndex === 'new') {
      updatedItems.push(newItem);
    } else {
      updatedItems[selectorItemIndex] = {
        ...updatedItems[selectorItemIndex],
        ...newItem
      };
    }

    setEditForm({
      ...editForm,
      items: updatedItems
    });

    // Reset selector states
    setSelectorItemIndex(null);
    setSelectorParentId(null);
    setSelectorSubId(null);
    setSelectorProductId(null);
    setSelectorSize(null);
    setSelectorQuantity(1);
  };

  const startEditing = (order: any) => {
    setEditingOrderId(order.id);
    setEditForm({
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail || '',
      address: order.address,
      district: order.district,
      paymentMethod: order.paymentMethod,
      items: order.items.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        sizeLabel: item.sizeLabel,
        quantity: item.quantity
      }))
    });
  };

  const saveOrderEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrderId || !editForm) return;

    if (editForm.items.length === 0) {
      alert("Please add at least one product to the order.");
      return;
    }

    setUpdatingId(editingOrderId);
    try {
      const res = await fetch('/api/shop/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingOrderId,
          customerName: editForm.customerName,
          customerPhone: editForm.customerPhone,
          customerEmail: editForm.customerEmail || null,
          address: editForm.address,
          district: editForm.district,
          paymentMethod: editForm.paymentMethod,
          items: editForm.items
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert(errorData.error || "Failed to save order changes.");
      } else {
        setEditingOrderId(null);
        setEditForm(null);
        await load(true);
      }
    } catch (err) {
      console.error(err);
      alert("Error saving edits.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleItemProductChange = (index: number, newProductId: string) => {
    if (!editForm) return;
    const newProduct = allProducts.find(p => p.id === newProductId);
    const firstSize = newProduct?.sizes?.[0]?.label || '';
    const updatedItems = [...editForm.items];
    updatedItems[index] = {
      ...updatedItems[index],
      productId: newProductId,
      sizeLabel: firstSize,
      quantity: 1
    };
    setEditForm({ ...editForm, items: updatedItems });
  };

  const handleItemSizeChange = (index: number, newSizeLabel: string) => {
    if (!editForm) return;
    const updatedItems = [...editForm.items];
    updatedItems[index] = {
      ...updatedItems[index],
      sizeLabel: newSizeLabel
    };
    setEditForm({ ...editForm, items: updatedItems });
  };

  const handleItemQuantityChange = (index: number, newQty: number) => {
    if (!editForm) return;
    const qty = Math.max(1, newQty);
    const updatedItems = [...editForm.items];
    updatedItems[index] = {
      ...updatedItems[index],
      quantity: qty
    };
    setEditForm({ ...editForm, items: updatedItems });
  };

  const handleRemoveItem = (index: number) => {
    if (!editForm) return;
    const updatedItems = editForm.items.filter((_: any, idx: number) => idx !== index);
    setEditForm({ ...editForm, items: updatedItems });
  };

  const handleAddItem = () => {
    openSelectorFlow('new');
  };

  useEffect(() => { load(); }, []);

  // Poll orders silently in the background every 5 seconds to sync state across different devices/admins
  useEffect(() => {
    const interval = setInterval(() => {
      // Avoid polling if we are currently editing an order or updating a status to prevent state overrides
      if (!updatingId && !editingOrderId) {
        fetch(`/api/shop/orders?t=${Date.now()}`)
          .then(r => r.json())
          .then(data => {
            if (Array.isArray(data)) {
              setOrders(data);
            }
          })
          .catch(err => console.error('Error polling shop orders:', err));
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [updatingId, editingOrderId]);

  const categoriesMap = useMemo(() => {
    const map = new Map<string, any>();
    categories.forEach(c => map.set(c.id, c));
    return map;
  }, [categories]);

  const ratioData = useMemo(() => {
    const filteredOrders = orders.filter(o => {
      if (o.status === 'canceled' || o.status === 'cancelled') return false;
      if (ratioStatusFilter === 'new') return o.status === 'new';
      if (ratioStatusFilter === 'ready') return o.status === 'ready';
      if (ratioStatusFilter === 'active') return o.status === 'new' || o.status === 'ready';
      if (ratioStatusFilter === 'all_active') return o.status === 'new' || o.status === 'ready' || o.status === 'on_the_way';
      return true; // 'all' (excluding cancelled)
    });

    const parentMap: Record<string, {
      id: string;
      name: string;
      totalQty: number;
      subCategories: Record<string, {
        id: string;
        name: string;
        totalQty: number;
        products: Record<string, {
          id: string;
          name: string;
          mainImage: string;
          totalQty: number;
          sizes: Record<string, number>;
        }>
      }>
    }> = {};

    // Pre-populate parent categories
    categories.forEach(c => {
      if (!c.parentId) {
        parentMap[c.id] = {
          id: c.id,
          name: c.name,
          totalQty: 0,
          subCategories: {}
        };
      }
    });

    filteredOrders.forEach(order => {
      (order.items || []).forEach((item: any) => {
        const product = item.product;
        if (!product) return;

        const category = product.category;
        if (!category) return;

        const qty = item.quantity || 0;
        const sizeLabel = item.sizeLabel || 'Unknown';

        let parentId = category.parentId;
        let parentName = '';
        let subId = category.id;
        let subName = category.name;

        if (parentId) {
          parentName = categoriesMap.get(parentId)?.name || 'Other Parent';
        } else {
          parentId = category.id;
          parentName = category.name;
          subId = 'direct';
          subName = 'General';
        }

        // Initialize parent if it wasn't pre-populated (e.g. category not in main list)
        if (!parentMap[parentId]) {
          parentMap[parentId] = {
            id: parentId,
            name: parentName,
            totalQty: 0,
            subCategories: {}
          };
        }
        parentMap[parentId].totalQty += qty;

        // Initialize subcategory
        if (!parentMap[parentId].subCategories[subId]) {
          parentMap[parentId].subCategories[subId] = {
            id: subId,
            name: subName,
            totalQty: 0,
            products: {}
          };
        }
        parentMap[parentId].subCategories[subId].totalQty += qty;

        // Initialize product
        const productId = item.productId;
        if (!parentMap[parentId].subCategories[subId].products[productId]) {
          parentMap[parentId].subCategories[subId].products[productId] = {
            id: productId,
            name: product.name || 'Product',
            mainImage: product.mainImage || '',
            totalQty: 0,
            sizes: {}
          };
        }
        parentMap[parentId].subCategories[subId].products[productId].totalQty += qty;

        // Add size quantity
        parentMap[parentId].subCategories[subId].products[productId].sizes[sizeLabel] = 
          (parentMap[parentId].subCategories[subId].products[productId].sizes[sizeLabel] || 0) + qty;
      });
    });

    // Convert into sorted arrays
    const parentList = Object.values(parentMap).map(parent => {
      const subCategoriesList = Object.values(parent.subCategories).map(sub => {
        const productsList = Object.values(sub.products).map(prod => {
          const sizesList = sortSizes(
            Object.entries(prod.sizes).map(([label, qty]) => ({
              label,
              qty,
              ratio: prod.totalQty > 0 ? (qty / prod.totalQty) : 0
            })),
            s => s.label
          );

          return {
            ...prod,
            sizes: sizesList,
            ratioInSub: sub.totalQty > 0 ? (prod.totalQty / sub.totalQty) : 0
          };
        }).sort((a, b) => b.totalQty - a.totalQty);

        return {
          ...sub,
          products: productsList,
          ratioInParent: parent.totalQty > 0 ? (sub.totalQty / parent.totalQty) : 0
        };
      }).sort((a, b) => b.totalQty - a.totalQty);

      return {
        ...parent,
        subCategories: subCategoriesList
      };
    }).sort((a, b) => b.totalQty - a.totalQty);

    return parentList;
  }, [orders, categoriesMap, ratioStatusFilter, categories]);

  const demographicData = useMemo(() => {
    if (!selectedParentCategoryId) return [];

    const filteredOrders = orders.filter(o => {
      if (o.status === 'canceled' || o.status === 'cancelled') return false;
      if (ratioStatusFilter === 'new') return o.status === 'new';
      if (ratioStatusFilter === 'ready') return o.status === 'ready';
      if (ratioStatusFilter === 'active') return o.status === 'new' || o.status === 'ready';
      if (ratioStatusFilter === 'all_active') return o.status === 'new' || o.status === 'ready' || o.status === 'on_the_way';
      return true; // 'all'
    });

    const districtMap: Record<string, { district: string; qty: number; orderCount: number }> = {};

    filteredOrders.forEach(order => {
      let categoryQty = 0;
      (order.items || []).forEach((item: any) => {
        const product = item.product;
        if (!product) return;

        const category = product.category;
        if (!category) return;

        const parentId = category.parentId || category.id;
        if (parentId === selectedParentCategoryId) {
          categoryQty += item.quantity || 0;
        }
      });

      if (categoryQty > 0) {
        const dist = order.district || 'Unknown';
        if (!districtMap[dist]) {
          districtMap[dist] = { district: dist, qty: 0, orderCount: 0 };
        }
        districtMap[dist].qty += categoryQty;
        districtMap[dist].orderCount += 1;
      }
    });

    return Object.values(districtMap)
      .sort((a, b) => b.qty - a.qty);
  }, [orders, selectedParentCategoryId, ratioStatusFilter]);

  const totalDemographicQty = useMemo(() => {
    return demographicData.reduce((sum, item) => sum + item.qty, 0);
  }, [demographicData]);

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    // Optimistic state update: update the order status locally immediately
    setOrders(prevOrders =>
      prevOrders.map(o => o.id === id ? { ...o, status } : o)
    );
    try {
      const res = await fetch('/api/shop/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) {
        throw new Error('Failed to update status on the server');
      }
      // Silently sync the updated list in the background
      await load(true);
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Error updating status. Reverting changes...');
      // Revert/refresh fully if update failed
      await load();
    } finally {
      setUpdatingId(null);
    }
  };

  const downloadInvoiceImage = async (order: any) => {
    const html2canvas = (await import('html2canvas')).default;

    // Create temporary container
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = '800px';
    container.style.backgroundColor = '#ffffff';
    container.style.color = '#000000';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.padding = '40px';
    container.style.boxSizing = 'border-box';

    const dateStr = new Date(order.createdAt).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    container.innerHTML = `
      <div style="background-color: #ffffff; color: #000000;">
        <!-- Invoice Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #059669; padding-bottom: 20px; margin-bottom: 30px;">
          <div>
            <h1 style="margin: 0; font-size: 28px; font-weight: 900; color: #059669; letter-spacing: -0.5px;">BOOK MY TURF</h1>
            <p style="margin: 4px 0 0 0; font-size: 11px; text-transform: uppercase; font-weight: bold; color: #4b5563; letter-spacing: 1.5px;">E-Commerce Receipt</p>
          </div>
          <div style="text-align: right;">
            <h2 style="margin: 0; font-size: 22px; font-weight: 900; color: #1f2937;">INVOICE</h2>
            <p style="margin: 4px 0 0 0; font-size: 13px; font-family: monospace; font-weight: bold; color: #059669;">#BMT-${order.id.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>

        <!-- Info Sections -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 40px; font-size: 13px; line-height: 1.5;">
          <div>
            <p style="margin: 0 0 8px 0; font-size: 10px; font-weight: 900; text-transform: uppercase; color: #9ca3af; letter-spacing: 1px;">Invoice Details</p>
            <p style="margin: 0; color: #374151;"><strong>Date:</strong> ${dateStr}</p>
            <p style="margin: 4px 0 0 0; color: #374151;"><strong>Payment Method:</strong> <span style="text-transform: uppercase;">${order.paymentMethod}</span></p>
            <p style="margin: 4px 0 0 0; color: #374151;"><strong>Order Status:</strong> <span style="text-transform: uppercase; font-weight: bold; color: #059669;">${order.status}</span></p>
          </div>
          <div style="text-align: right; max-width: 300px;">
            <p style="margin: 0 0 8px 0; font-size: 10px; font-weight: 900; text-transform: uppercase; color: #9ca3af; letter-spacing: 1px;">Customer Information</p>
            <p style="margin: 0; font-size: 15px; font-weight: bold; color: #1f2937;">${order.customerName}</p>
            <p style="margin: 4px 0 0 0; color: #4b5563;">${order.customerPhone}</p>
            ${order.customerEmail ? `<p style="margin: 4px 0 0 0; color: #4b5563;">${order.customerEmail}</p>` : ''}
            <p style="margin: 6px 0 0 0; font-size: 12px; color: #4b5563; white-space: pre-wrap;">${order.address}, ${order.district}</p>
          </div>
        </div>

        <!-- Table Header -->
        <div style="display: flex; background-color: #f3f4f6; border-radius: 8px; padding: 12px; font-weight: bold; font-size: 12px; color: #374151; margin-bottom: 10px;">
          <div style="flex: 2;">Item Description</div>
          <div style="width: 80px; text-align: center;">Size</div>
          <div style="width: 80px; text-align: center;">Qty</div>
          <div style="width: 100px; text-align: right;">Price</div>
          <div style="width: 120px; text-align: right;">Total</div>
        </div>

        <!-- Table Rows -->
        <div style="margin-bottom: 30px;">
          ${order.items.map((item: any) => `
            <div style="display: flex; align-items: center; padding: 14px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #4b5563;">
              <div style="flex: 2; font-weight: bold; color: #1f2937;">${item.product?.name ?? 'Product'}</div>
              <div style="width: 80px; text-align: center; font-weight: bold; color: #374151;">${item.sizeLabel}</div>
              <div style="width: 80px; text-align: center;">${item.quantity}</div>
              <div style="width: 100px; text-align: right;">৳${item.price.toLocaleString()}</div>
              <div style="width: 120px; text-align: right; font-weight: bold; color: #1f2937;">৳${(item.price * item.quantity).toLocaleString()}</div>
            </div>
          `).join('')}
        </div>

        <!-- Summary Block -->
        <div style="display: flex; justify-content: flex-end; margin-bottom: 50px;">
          <div style="width: 300px; font-size: 13px; line-height: 1.8;">
            <div style="display: flex; justify-content: space-between; color: #4b5563; padding: 4px 0;">
              <span>Subtotal:</span>
              <span>৳${order.subtotal?.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; color: #4b5563; padding: 4px 0; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">
              <span>Delivery Charge:</span>
              <span>৳${order.deliveryCharge?.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; color: #059669; padding-top: 10px;">
              <span>Grand Total:</span>
              <span>৳${order.total?.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <!-- Invoice Footer -->
        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center; color: #9ca3af; font-size: 11px;">
          <p style="margin: 0; font-weight: bold; color: #4b5563;">Thank you for shopping with Book My Turf BD!</p>
          <p style="margin: 4px 0 0 0;">This is an electronically generated receipt.</p>
        </div>
      </div>
    `;

    document.body.appendChild(container);

    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `Invoice_BMT_${order.id.slice(0, 8).toUpperCase()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error generating invoice image:', error);
      alert('Failed to generate invoice image.');
    } finally {
      document.body.removeChild(container);
    }
  };

  const byDay = useMemo(() => {
    const map: Record<string, any[]> = {};
    orders.forEach(o => {
      const day = new Date(o.createdAt).toISOString().split('T')[0];
      if (!map[day]) map[day] = [];
      map[day].push(o);
    });
    return map;
  }, [orders]);

  const sortedDays = useMemo(() => Object.keys(byDay).sort((a, b) => b.localeCompare(a)), [byDay]);

  const dateFilteredOrders = useMemo(() => {
    if (!filterDate) return orders;
    return orders.filter(o => {
      const day = new Date(o.createdAt).toISOString().split('T')[0];
      return day === filterDate;
    });
  }, [orders, filterDate]);

  const statusCounts = useMemo(() => {
    return {
      all: dateFilteredOrders.length,
      new: dateFilteredOrders.filter(o => o.status === 'new' || o.status === 'pending').length,
      ready: dateFilteredOrders.filter(o => o.status === 'ready').length,
      on_the_way: dateFilteredOrders.filter(o => o.status === 'on_the_way').length,
      delivered: dateFilteredOrders.filter(o => o.status === 'delivered').length,
      canceled: dateFilteredOrders.filter(o => o.status === 'canceled' || o.status === 'cancelled').length,
      exchange: dateFilteredOrders.filter(o => o.status === 'exchange').length,
      returned: dateFilteredOrders.filter(o => o.status === 'returned').length,
      no_answer: dateFilteredOrders.filter(o => o.status === 'no_answer').length,
    };
  }, [dateFilteredOrders]);

  const STATUS_TABS = [
    { id: 'all', label: 'All 📋', count: statusCounts.all },
    { id: 'new', label: 'New 🛍️', count: statusCounts.new },
    { id: 'ready', label: 'Ready 📦', count: statusCounts.ready },
    { id: 'on_the_way', label: 'On the Way 🚚', count: statusCounts.on_the_way },
    { id: 'delivered', label: 'Delivered ✅', count: statusCounts.delivered },
    { id: 'no_answer', label: 'No Answer 📞', count: statusCounts.no_answer },
    { id: 'canceled', label: 'Canceled ❌', count: statusCounts.canceled },
    { id: 'exchange', label: 'Exchange 🔄', count: statusCounts.exchange },
    { id: 'returned', label: 'Returned ↩️', count: statusCounts.returned },
  ];

  const TAB_TITLES: Record<string, string> = {
    all: 'All Orders',
    new: 'New Orders',
    ready: 'Ready to Ship',
    on_the_way: 'Dispatched Orders',
    delivered: 'Delivered Orders',
    no_answer: 'No Answer Orders',
    canceled: 'Canceled Orders',
    exchange: 'Exchange Requests',
    returned: 'Returned Orders'
  };

  const finalOrdersList = useMemo(() => {
    let list = dateFilteredOrders;
    if (selectedStatus !== 'all') {
      list = dateFilteredOrders.filter(o => {
        if (selectedStatus === 'new') {
          return o.status === 'new' || o.status === 'pending';
        }
        if (selectedStatus === 'canceled') {
          return o.status === 'canceled' || o.status === 'cancelled';
        }
        return o.status === selectedStatus;
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      const queryCleaned = query.replace(/\D/g, '');
      const queryNormalized = queryCleaned.startsWith('880') ? queryCleaned.slice(2) : (queryCleaned.startsWith('0') ? queryCleaned : '');

      list = list.filter(o => {
        const nameMatches = o.customerName?.toLowerCase().includes(query);
        const emailMatches = o.customerEmail?.toLowerCase().includes(query);
        
        let phoneMatches = false;
        if (o.customerPhone) {
          const storedPhoneCleaned = o.customerPhone.replace(/\D/g, '');
          const storedPhoneNormalized = storedPhoneCleaned.startsWith('880') ? storedPhoneCleaned.slice(2) : storedPhoneCleaned;
          
          if (queryNormalized) {
            phoneMatches = storedPhoneNormalized.includes(queryNormalized);
          } else {
            phoneMatches = storedPhoneCleaned.includes(query);
          }
        }

        return nameMatches || emailMatches || phoneMatches;
      });
    }

    return list;
  }, [dateFilteredOrders, selectedStatus, searchQuery]);

  // Daily revenue stats card
  const todayStr = new Date().toISOString().split('T')[0];
  const viewDay = sortedDays[historyDayOffset] ?? todayStr;
  const viewOrders = byDay[viewDay] ?? [];
  const viewRevenue = viewOrders.filter(o => o.status !== 'canceled' && o.status !== 'cancelled').reduce((s: number, o: any) => s + (o.total ?? 0), 0);
  const viewCount = viewOrders.filter(o => o.status !== 'canceled' && o.status !== 'cancelled').length;

  const todayOrders = byDay[todayStr] ?? [];
  const todayRevenue = todayOrders.filter(o => o.status !== 'canceled' && o.status !== 'cancelled').reduce((s: number, o: any) => s + (o.total ?? 0), 0);
  const lifetimeRevenue = orders.filter(o => o.status !== 'canceled' && o.status !== 'cancelled').reduce((s: number, o: any) => s + (o.total ?? 0), 0);

  // Product Selector Modal computations
  const filteredProducts = useMemo(() => {
    if (!selectorParentId) return [];
    const targetCatId = (selectorSubId === 'direct') ? selectorParentId : selectorSubId;
    if (!targetCatId) return [];
    return allProducts.filter(p => p.categoryId === targetCatId);
  }, [allProducts, selectorParentId, selectorSubId]);

  const selectedProductDetails = useMemo(() => {
    if (!selectorProductId) return null;
    return allProducts.find(p => p.id === selectorProductId);
  }, [allProducts, selectorProductId]);

  const sortedProductSizes = useMemo(() => {
    if (!selectedProductDetails || !selectedProductDetails.sizes) return [];
    return sortSizes(selectedProductDetails.sizes, (s: any) => s.label);
  }, [selectedProductDetails]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-accent" /></div>;

  return (
    <div className="flex flex-col gap-6">

      {/* ── Tab Switcher ── */}
      <div className="flex gap-2 p-1.5 bg-[var(--panel-bg)] rounded-2xl border border-[var(--panel-border)] w-fit shrink-0">
        <button
          onClick={() => {
            setActiveTab('list');
            setSelectedParentCategoryId(null);
            setCategoryViewTab('products');
          }}
          className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all ${
            activeTab === 'list' ? 'bg-accent text-black shadow-md' : 'text-[var(--muted)] hover:text-foreground'
          }`}
        >
          📋 Orders List
        </button>
        <button
          onClick={() => setActiveTab('ratio')}
          className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all ${
            activeTab === 'ratio' ? 'bg-accent text-black shadow-md' : 'text-[var(--muted)] hover:text-foreground'
          }`}
        >
          📊 Order Info
        </button>
      </div>

      {activeTab === 'list' ? (
        <>
          {/* ── Stats Row ── */}
          <div className={`grid grid-cols-2 ${role === 'shop_manager' ? 'lg:grid-cols-2' : 'lg:grid-cols-4'} gap-4`}>
            {role !== 'shop_manager' && (
              <>
                <StatCard label="Lifetime Revenue" value={`৳${lifetimeRevenue.toLocaleString()}`} sub={`${orders.filter(o => o.status !== 'canceled' && o.status !== 'cancelled').length} non-cancelled orders`} color="text-accent" bg="bg-accent/10" border="border-accent/20" icon={TrendingUp} />
                <StatCard label="Today's Revenue" value={`৳${todayRevenue.toLocaleString()}`} sub={`${todayOrders.filter(o => o.status !== 'canceled' && o.status !== 'cancelled').length} orders today`} color="text-emerald-400" bg="bg-emerald-400/10" border="border-emerald-400/20" icon={Calendar} />
              </>
            )}
            <StatCard label="Pending Orders" value={orders.filter(o => o.status === 'new' || o.status === 'pending').length.toString()} sub="Awaiting action" color="text-yellow-400" bg="bg-yellow-400/10" border="border-yellow-400/20" icon={Clock} />
            <StatCard label="Delivered" value={orders.filter(o => o.status === 'delivered').length.toString()} sub="Completed orders" color="text-blue-400" bg="bg-blue-400/10" border="border-blue-400/20" icon={Truck} />
          </div>

          {/* ── Daily Revenue/Orders History ── */}
          <div className="glass-panel border border-[var(--panel-border)] rounded-3xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-accent" />
                <h2 className="font-black">{role === 'shop_manager' ? 'Daily Orders' : 'Daily Revenue'}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setHistoryDayOffset(d => d + 1)} disabled={historyDayOffset >= sortedDays.length - 1}
                  className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 disabled:opacity-30 transition-colors">
                  <ChevronLeft size={15} />
                </button>
                <span className="text-sm font-bold min-w-[110px] text-center">
                  {historyDayOffset === 0 ? 'Today' : historyDayOffset === 1 ? 'Yesterday' : viewDay}
                </span>
                <button onClick={() => setHistoryDayOffset(d => Math.max(0, d - 1))} disabled={historyDayOffset === 0}
                  className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 disabled:opacity-30 transition-colors">
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>

            <div className={`grid ${role === 'shop_manager' ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
              {role !== 'shop_manager' && (
                <div className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-2xl p-4 flex flex-col gap-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Revenue</p>
                  <p className="text-2xl font-black text-accent">৳{viewRevenue.toLocaleString()}</p>
                </div>
              )}
              <div className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-2xl p-4 flex flex-col gap-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Orders</p>
                <p className="text-2xl font-black text-white">{viewCount}</p>
                <p className="text-[10px] text-[var(--muted)]">{viewOrders.filter(o => o.status === 'cancelled').length} cancelled</p>
              </div>
            </div>
          </div>

          {/* ── Status Tabs Switcher ── */}
          <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar shrink-0">
            {STATUS_TABS.map(tab => {
              const isActive = selectedStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedStatus(tab.id)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black shrink-0 transition-all border flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-accent text-black border-accent shadow-md shadow-accent/20'
                      : 'bg-[var(--panel-bg)] text-[var(--muted)] border-[var(--panel-border)] hover:text-foreground hover:bg-[var(--panel-bg-hover)]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                    isActive ? 'bg-black/10 text-black' : 'bg-white/5 text-[var(--muted)]'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── All Orders — Compact Rows ── */}
          <div className="glass-panel border border-[var(--panel-border)] rounded-3xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--panel-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-black/20">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <ShoppingBag size={16} className="text-accent" />
                  <h2 className="font-black">
                    {TAB_TITLES[selectedStatus] ?? 'Orders'} ({finalOrdersList.length})
                  </h2>
                </div>
                <button onClick={() => load()} className="text-xs text-[var(--muted)] hover:text-foreground transition-colors font-bold">Refresh</button>
              </div>

              {/* Search & Date Filters */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Search Customer Input */}
                <div className="flex items-center gap-2 bg-[var(--panel-bg)] border border-[var(--panel-border)] px-3.5 py-1.5 rounded-xl w-full sm:w-64">
                  <Search size={13} className="text-accent shrink-0" />
                  <input
                    type="text"
                    placeholder="Search name, phone, email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent text-xs font-black outline-none border-none text-white w-full placeholder:text-[var(--muted)]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-[10px] bg-white/10 hover:bg-white/20 text-white font-bold px-1.5 py-0.5 rounded transition-colors shrink-0"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Date Filter Input */}
                <div className="flex items-center gap-2 bg-[var(--panel-bg)] border border-[var(--panel-border)] px-3 py-1.5 rounded-xl">
                  <Calendar size={13} className="text-accent shrink-0" />
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="bg-transparent text-xs font-black outline-none border-none cursor-pointer text-white [color-scheme:dark]"
                  />
                  {filterDate && (
                    <button
                      onClick={() => setFilterDate('')}
                      className="text-[10px] bg-white/10 hover:bg-white/20 text-white font-bold px-1.5 py-0.5 rounded transition-colors shrink-0"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-16 text-[var(--muted)]">
                <Package size={40} className="opacity-20 mb-4" />
                <p className="font-bold">No orders yet</p>
              </div>
            ) : finalOrdersList.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-16 text-[var(--muted)] text-center">
                <Package size={40} className="opacity-20 mb-4" />
                <p className="font-bold">No orders found</p>
                <p className="text-xs text-[var(--muted)] mt-1">
                  There are no orders with status <span className="text-white font-black">"{STATUS_TABS.find(t => t.id === selectedStatus)?.label.split(' ')[0]}"</span>
                  {filterDate ? ` on ${filterDate}` : ''}
                  {searchQuery ? ` matching "${searchQuery}"` : ''}.
                </p>
                {(filterDate || selectedStatus !== 'all' || searchQuery) && (
                  <div className="flex gap-2 justify-center mt-4">
                    {filterDate && (
                      <button
                        onClick={() => setFilterDate('')}
                        className="px-3 py-1.5 bg-white/5 border border-white/10 text-white font-bold text-xs rounded-xl hover:bg-white/10 transition-colors"
                      >
                        Clear Date Filter
                      </button>
                    )}
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="px-3 py-1.5 bg-white/5 border border-white/10 text-white font-bold text-xs rounded-xl hover:bg-white/10 transition-colors"
                      >
                        Clear Search
                      </button>
                    )}
                    {selectedStatus !== 'all' && (
                      <button
                        onClick={() => setSelectedStatus('all')}
                        className="px-3 py-1.5 bg-accent text-black font-black text-xs rounded-xl hover:bg-accent/80 transition-colors"
                      >
                        Show All Statuses
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-[var(--panel-border)]">
                {finalOrdersList.map((order, index) => {
                  const isExpanded = expandedId === order.id;
                  const isUpdating = updatingId === order.id;
                  return (
                    <div key={order.id}>
                      {/* Single-line row */}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : order.id)}
                        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-white/3 transition-colors text-left"
                      >
                        <span className="text-xs font-bold text-[var(--muted)] w-6 shrink-0">{index + 1}</span>
                        <span className="font-mono text-xs text-[var(--muted)] w-16 shrink-0">#{order.id.slice(0, 6).toUpperCase()}</span>
                        <span className="font-bold text-sm flex-1 truncate">{order.customerName}</span>
                        <span className="text-xs text-[var(--muted)] hidden sm:block w-24 shrink-0 truncate">{order.district}</span>
                        <span className="text-xs text-[var(--muted)] hidden md:block w-32 shrink-0">{new Date(order.createdAt).toLocaleDateString()}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border shrink-0 ${STATUS_STYLES[order.status] ?? STATUS_STYLES.pending}`}>
                          {order.status}
                        </span>
                        <span className="font-black text-accent text-sm w-20 text-right shrink-0">৳{order.total.toLocaleString()}</span>
                        {isExpanded ? <ChevronUp size={14} className="shrink-0 text-[var(--muted)]" /> : <ChevronDown size={14} className="shrink-0 text-[var(--muted)]" />}
                      </button>

                      {/* Expanded detail */}
                      {isExpanded && (
                        editingOrderId === order.id ? (
                          <form onSubmit={saveOrderEdits} className="px-5 pb-5 pt-4 bg-black/35 flex flex-col gap-5 border-t border-[var(--panel-border)]/50 animate-in fade-in-30 duration-200">
                            <div className="flex items-center justify-between border-b border-[var(--panel-border)]/30 pb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-accent">Editing Order #{order.id.slice(0, 8).toUpperCase()}</span>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="submit"
                                  disabled={updatingId === order.id}
                                  className="px-4 py-2 bg-accent hover:brightness-110 text-black font-black text-xs rounded-xl transition-all shadow-md shadow-accent/10 flex items-center gap-1.5"
                                >
                                  {updatingId === order.id ? <Loader2 size={12} className="animate-spin" /> : null}
                                  Save 💾
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingOrderId(null);
                                    setEditForm(null);
                                  }}
                                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs rounded-xl transition-all"
                                >
                                  Cancel ❌
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Left Column: Customer details */}
                              <div className="flex flex-col gap-3">
                                <h3 className="text-xs font-black uppercase tracking-widest text-[var(--muted)] border-b border-[var(--panel-border)]/20 pb-1.5">Customer Details</h3>
                                
                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Customer Name</label>
                                  <input
                                    required
                                    type="text"
                                    value={editForm.customerName}
                                    onChange={e => setEditForm({ ...editForm, customerName: e.target.value })}
                                    className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-3 py-2 outline-none focus:border-accent text-sm text-white"
                                  />
                                </div>

                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Customer Phone</label>
                                  <input
                                    required
                                    type="tel"
                                    value={editForm.customerPhone}
                                    onChange={e => setEditForm({ ...editForm, customerPhone: e.target.value })}
                                    className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-3 py-2 outline-none focus:border-accent text-sm text-white"
                                  />
                                </div>

                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Customer Email (Optional)</label>
                                  <input
                                    type="email"
                                    value={editForm.customerEmail}
                                    onChange={e => setEditForm({ ...editForm, customerEmail: e.target.value })}
                                    className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-3 py-2 outline-none focus:border-accent text-sm text-white"
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">District</label>
                                    <select
                                      value={editForm.district}
                                      onChange={e => setEditForm({ ...editForm, district: e.target.value })}
                                      className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-3 py-2 outline-none focus:border-accent text-sm text-white [color-scheme:dark]"
                                    >
                                      {BD_DISTRICTS.map(d => (
                                        <option key={d} value={d} className="bg-neutral-950 text-white">{d}</option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Payment Method</label>
                                    <select
                                      value={editForm.paymentMethod}
                                      onChange={e => setEditForm({ ...editForm, paymentMethod: e.target.value })}
                                      className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-3 py-2 outline-none focus:border-accent text-sm text-white [color-scheme:dark]"
                                    >
                                      <option value="cod" className="bg-neutral-950 text-white">COD</option>
                                      <option value="wallet" className="bg-neutral-950 text-white">Wallet</option>
                                    </select>
                                  </div>
                                </div>

                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Delivery Address</label>
                                  <textarea
                                    required
                                    rows={2}
                                    value={editForm.address}
                                    onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                                    className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-3 py-2 outline-none focus:border-accent text-sm text-white resize-none"
                                  />
                                </div>
                              </div>

                              {/* Right Column: Order Items */}
                              <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between border-b border-[var(--panel-border)]/20 pb-1.5">
                                  <h3 className="text-xs font-black uppercase tracking-widest text-[var(--muted)]">Order Items</h3>
                                  <button
                                    type="button"
                                    onClick={handleAddItem}
                                    className="text-[10px] bg-accent/10 border border-accent/20 hover:bg-accent/20 text-accent font-black px-2.5 py-1 rounded-lg transition-all flex items-center gap-1"
                                  >
                                    Add Item ➕
                                  </button>
                                </div>

                                <div className="flex flex-col gap-3 max-h-[320px] overflow-y-auto pr-1 hide-scrollbar">
                                  {editForm.items.map((item: any, idx: number) => {
                                    const selectedProd = allProducts.find(p => p.id === item.productId);
                                    const rawSizes = selectedProd?.sizes || [];
                                    const sizes = sortSizes(rawSizes, (s: any) => s.label);
                                    
                                    return (
                                      <div key={idx} className="flex gap-2 items-start bg-white/2 border border-white/5 rounded-xl p-3 relative animate-in fade-in duration-200">
                                        {/* Product selector trigger button */}
                                        <div className="flex-1 flex flex-col gap-2 min-w-0">
                                          <div className="flex flex-col gap-1">
                                            <label className="text-[9px] text-[var(--muted)] font-black uppercase tracking-wider">Product</label>
                                            <button
                                              type="button"
                                              onClick={() => openSelectorFlow(idx)}
                                              className="flex items-center gap-2.5 text-left bg-[var(--panel-bg)] hover:bg-[var(--panel-bg-hover)] border border-[var(--panel-border)] rounded-lg px-2.5 py-1.5 outline-none text-xs text-white transition-all w-full select-none"
                                            >
                                              {selectedProd?.mainImage ? (
                                                <img src={selectedProd.mainImage} className="w-8 h-10 object-cover rounded bg-neutral-900 border border-white/5 shrink-0" />
                                              ) : (
                                                <div className="w-8 h-10 bg-neutral-900 border border-white/5 rounded shrink-0 flex items-center justify-center">
                                                  <Package size={14} className="text-zinc-500" />
                                                </div>
                                              )}
                                              <div className="flex-1 min-w-0">
                                                <p className="font-bold truncate text-white">{selectedProd?.name || 'Select Product...'}</p>
                                                <p className="text-[9px] text-accent font-bold">Tap to change product 🔄</p>
                                              </div>
                                              <ChevronDown size={14} className="text-[var(--muted)] shrink-0" />
                                            </button>
                                          </div>

                                          <div className="grid grid-cols-2 gap-2">
                                            {/* Size selector */}
                                            <div className="flex flex-col gap-0.5">
                                              <label className="text-[9px] text-[var(--muted)] font-bold">Size</label>
                                              <select
                                                value={item.sizeLabel}
                                                onChange={e => handleItemSizeChange(idx, e.target.value)}
                                                className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-lg px-2 py-1 outline-none focus:border-accent text-xs text-white [color-scheme:dark]"
                                              >
                                                {sizes.map((s: any) => (
                                                  <option key={s.label} value={s.label} className="bg-neutral-950 text-white">
                                                    {s.label} (Stock: {s.quantity})
                                                  </option>
                                                ))}
                                                {sizes.length === 0 && (
                                                  <option value="" className="bg-neutral-950 text-white">No sizes</option>
                                                )}
                                              </select>
                                            </div>

                                            {/* Quantity selector */}
                                            <div className="flex flex-col gap-0.5">
                                              <label className="text-[9px] text-[var(--muted)] font-bold">Qty</label>
                                              <div className="flex items-center">
                                                <button
                                                  type="button"
                                                  onClick={() => handleItemQuantityChange(idx, item.quantity - 1)}
                                                  className="w-7 h-7 flex items-center justify-center bg-white/5 border border-white/10 border-r-0 rounded-l-lg hover:bg-white/10 text-xs font-bold"
                                                >
                                                  -
                                                </button>
                                                <input
                                                  type="number"
                                                  min="1"
                                                  value={item.quantity}
                                                  onChange={e => handleItemQuantityChange(idx, parseInt(e.target.value) || 1)}
                                                  className="w-10 h-7 bg-transparent border-t border-b border-white/10 text-center text-xs text-white outline-none font-bold"
                                                />
                                                <button
                                                  type="button"
                                                  onClick={() => handleItemQuantityChange(idx, item.quantity + 1)}
                                                  className="w-7 h-7 flex items-center justify-center bg-white/5 border border-white/10 border-l-0 rounded-r-lg hover:bg-white/10 text-xs font-bold"
                                                >
                                                  +
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Remove button */}
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveItem(idx)}
                                          className="w-7 h-7 flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg shrink-0 transition-colors mt-5"
                                          title="Remove Item"
                                        >
                                          ❌
                                        </button>
                                      </div>
                                    );
                                  })}

                                  {editForm.items.length === 0 && (
                                    <p className="text-xs text-[var(--muted)] italic text-center py-6">
                                      No items in order. Click "Add Item" to add products.
                                    </p>
                                  )}
                                </div>

                                {/* Live pricing & discount calculation breakdown */}
                                {evaluatedEditCart && (
                                  <div className="mt-4 p-4 bg-white/2 border border-white/5 rounded-2xl flex flex-col gap-2 text-xs text-[var(--muted)]">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-white border-b border-white/5 pb-1.5 mb-1">
                                      Live Calculation Breakdown 🧮
                                    </h4>
                                    
                                    <div className="flex justify-between">
                                      <span>Original Subtotal:</span>
                                      <span className="font-mono text-white">৳{evaluatedEditCart.subtotalBeforeDiscount.toLocaleString()}</span>
                                    </div>
                                    
                                    {evaluatedEditCart.savings > 0 && (
                                      <div className="flex justify-between text-emerald-400 font-bold">
                                        <span>Discount Applied:</span>
                                        <span>-৳{evaluatedEditCart.savings.toLocaleString()} ({Math.round((evaluatedEditCart.savings / evaluatedEditCart.subtotalBeforeDiscount) * 100)}% off)</span>
                                      </div>
                                    )}

                                    {evaluatedEditCart.appliedDiscountNames?.length > 0 && (
                                      <div className="flex flex-col gap-1 border-t border-white/5 pt-1.5 mt-0.5 pb-1.5 mb-0.5 animate-in slide-in-from-top-1 duration-255">
                                        <span className="text-[9px] font-black uppercase text-[var(--muted)]">Active Campaigns:</span>
                                        <div className="flex flex-wrap gap-1">
                                          {evaluatedEditCart.appliedDiscountNames.map((name: string) => (
                                            <span key={name} className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-black">
                                              🔥 {name}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    
                                    <div className="flex justify-between">
                                      <span>Delivery Charge ({editForm.district}):</span>
                                      <span className={evaluatedEditCart.deliveryCharge === 0 ? "text-emerald-400 font-bold" : "text-white"}>
                                        {evaluatedEditCart.deliveryCharge === 0 ? "Free Delivery" : `৳${evaluatedEditCart.deliveryCharge.toLocaleString()}`}
                                      </span>
                                    </div>
                                    
                                    <div className="flex justify-between border-t border-white/10 pt-2 mt-1 font-black text-accent text-sm">
                                      <span>Grand Total:</span>
                                      <span>৳{evaluatedEditCart.total.toLocaleString()}</span>
                                    </div>
                                  </div>
                                )}
                                {evaluatingEditCart && (
                                  <div className="flex items-center justify-center gap-2 py-4 text-xs text-[var(--muted)]">
                                    <Loader2 size={12} className="animate-spin text-accent" />
                                    <span>Recalculating discounts...</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </form>
                        ) : (
                          <div className="px-5 pb-5 bg-black/20 flex flex-col gap-4 border-t border-[var(--panel-border)]/50">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                              {/* Customer info */}
                              <div className="flex flex-col gap-2 text-sm">
                                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] mb-1">Customer</p>
                                <div className="flex items-center gap-2"><User size={13} className="text-[var(--muted)]" /><span className="font-bold">{order.customerName}</span></div>
                                <div className="flex items-center gap-2"><Phone size={13} className="text-[var(--muted)]" /><span>{order.customerPhone}</span></div>
                                {order.customerEmail && <div className="flex items-center gap-2"><Mail size={13} className="text-[var(--muted)]" /><span>{order.customerEmail}</span></div>}
                                <div className="flex items-start gap-2"><MapPin size={13} className="text-[var(--muted)] mt-0.5 shrink-0" /><span className="text-xs">{order.address}, <span className="font-black text-[var(--muted)]">{order.district}</span></span></div>
                                <div className="flex items-center gap-2"><Banknote size={13} className="text-[var(--muted)]" /><span className="uppercase text-xs font-black text-accent bg-accent/10 px-2 rounded border border-accent/20">{order.paymentMethod}</span></div>
                              </div>

                              {/* Items */}
                              <div className="flex flex-col gap-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] mb-1">Items ({order.items.length})</p>
                                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto hide-scrollbar">
                                  {order.items.map((item: any) => {
                                    const matchingSize = item.product?.sizes?.find(
                                      (s: any) => s.label?.toUpperCase() === item.sizeLabel?.toUpperCase()
                                    );
                                    const originalUnitPrice = matchingSize ? (matchingSize.salePrice ?? matchingSize.basePrice) : item.price;
                                    const isDiscounted = originalUnitPrice > item.price;
                                    const itemOriginalTotal = originalUnitPrice * item.quantity;
                                    const itemFinalTotal = item.price * item.quantity;
                                    const itemDiscountTotal = itemOriginalTotal - itemFinalTotal;

                                    return (
                                      <div key={item.id} className="flex items-center gap-3 py-1.5 border-b border-[var(--panel-border)]/20 last:border-b-0">
                                        {item.product?.mainImage && (
                                          <img src={item.product.mainImage} className="w-9 h-11 rounded-lg object-cover bg-neutral-900 border border-white/10 shrink-0" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <p className="font-bold text-xs truncate text-white">{item.product?.name ?? 'Product'}</p>
                                          <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[9px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded font-black text-[var(--muted)]">
                                              Size: {item.sizeLabel}
                                            </span>
                                            <span className="text-[9px] text-[var(--muted)] font-bold">
                                              Qty: {item.quantity}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="text-right shrink-0 flex flex-col justify-center">
                                          {isDiscounted ? (
                                            <>
                                              <div className="flex items-center gap-1.5 justify-end">
                                                <span className="text-[10px] text-red-400 line-through font-bold">
                                                  ৳{itemOriginalTotal.toLocaleString()}
                                                </span>
                                                <span className="font-black text-xs text-accent">
                                                  ৳{itemFinalTotal.toLocaleString()}
                                                </span>
                                              </div>
                                              <span className="text-[9px] font-black text-emerald-400">
                                                -৳{itemDiscountTotal.toLocaleString()} ({Math.round((itemDiscountTotal / itemOriginalTotal) * 100)}% off)
                                              </span>
                                            </>
                                          ) : (
                                            <span className="font-black text-xs text-white font-mono">
                                              ৳{itemFinalTotal.toLocaleString()}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                {(() => {
                                  const orderOriginalSubtotal = order.items.reduce((sum: number, item: any) => {
                                    const matchingSize = item.product?.sizes?.find(
                                      (s: any) => s.label?.toUpperCase() === item.sizeLabel?.toUpperCase()
                                    );
                                    const originalUnitPrice = matchingSize ? (matchingSize.salePrice ?? matchingSize.basePrice) : item.price;
                                    return sum + (originalUnitPrice * item.quantity);
                                  }, 0);
                                  const orderFinalSubtotal = order.subtotal ?? 0;
                                  const totalDiscountAmount = orderOriginalSubtotal - orderFinalSubtotal;

                                  return (
                                    <div className="flex flex-col gap-1 text-xs text-[var(--muted)] border-t border-[var(--panel-border)] pt-2 mt-1">
                                      {totalDiscountAmount > 0 ? (
                                        <>
                                          <div className="flex justify-between">
                                            <span>Subtotal (Original):</span>
                                            <span className="text-[var(--muted)] line-through font-mono">
                                              ৳{orderOriginalSubtotal.toLocaleString()}
                                            </span>
                                          </div>
                                          <div className="flex justify-between text-emerald-400 font-bold">
                                            <span>Discount (Cut):</span>
                                            <span>-৳{totalDiscountAmount.toLocaleString()} ({Math.round((totalDiscountAmount / orderOriginalSubtotal) * 100)}% off)</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span>Subtotal (After Discount):</span>
                                            <span className="text-white font-bold font-mono">৳{orderFinalSubtotal.toLocaleString()}</span>
                                          </div>
                                        </>
                                      ) : (
                                        <div className="flex justify-between">
                                          <span>Subtotal:</span>
                                          <span className="text-white font-bold font-mono">৳{orderFinalSubtotal.toLocaleString()}</span>
                                        </div>
                                      )}
                                      <div className="flex justify-between">
                                        <span>Delivery Charge:</span>
                                        <span className={order.deliveryCharge === 0 ? "text-emerald-400 font-bold" : "text-white"}>
                                          {order.deliveryCharge === 0 ? "Free" : `৳${order.deliveryCharge?.toLocaleString()}`}
                                        </span>
                                      </div>
                                      <div className="flex justify-between border-t border-[var(--panel-border)]/50 pt-1 mt-1 font-black text-accent text-sm">
                                        <span>Total Amount:</span>
                                        <span className="font-mono">৳{order.total?.toLocaleString()}</span>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                            {/* Status actions */}
                            <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--panel-border)]/50 items-center">
                              <button
                                onClick={() => downloadInvoiceImage(order)}
                                className="px-3 py-1.5 rounded-xl text-xs font-black border border-accent/20 bg-accent/10 text-accent hover:bg-accent/20 transition-all flex items-center gap-1.5"
                              >
                                Invoice 🧾
                              </button>
                              <button
                                onClick={() => startEditing(order)}
                                className="px-3 py-1.5 rounded-xl text-xs font-black border border-blue-500/20 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all flex items-center gap-1.5 mr-auto"
                              >
                                Edit Order ✏️
                              </button>
                              {TRANSITIONS[order.status]?.map(t => (
                                <button key={t.status} onClick={() => updateStatus(order.id, t.status)} disabled={isUpdating}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all disabled:opacity-40 flex items-center gap-1.5 ${t.style}`}>
                                  {isUpdating ? <Loader2 size={12} className="animate-spin" /> : null}
                                  {t.label}
                                </button>
                              ))}
                              {(!TRANSITIONS[order.status] || TRANSITIONS[order.status].length === 0) && (
                                <span className="text-xs text-[var(--muted)] italic font-bold">Terminal status ({order.status}) - No transitions available</span>
                              )}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        /* ── Ratio Aggregation View ── */
        <div className="flex flex-col gap-6">
          {/* Header & Filter Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg md:text-2xl font-black">Order Info Analysis</h2>
              <p className="text-sm text-[var(--muted)]">Product demand and area demographics breakdown.</p>
            </div>
            <div className="flex items-center gap-2 bg-[var(--panel-bg)] border border-[var(--panel-border)] px-4 py-2.5 rounded-2xl shrink-0">
              <ListFilter size={15} className="text-accent" />
              <span className="text-xs font-bold text-[var(--muted)]">Status Filter:</span>
              <select
                value={ratioStatusFilter}
                onChange={e => setRatioStatusFilter(e.target.value)}
                className="bg-transparent text-xs font-black outline-none border-none cursor-pointer pr-4 text-white"
              >
                <option value="active" className="bg-[#121212] text-white">Active (New + Ready)</option>
                <option value="new" className="bg-[#121212] text-white">New Only</option>
                <option value="ready" className="bg-[#121212] text-white">Ready Only</option>
                <option value="all_active" className="bg-[#121212] text-white">All Active (New + Ready + Dispatch)</option>
                <option value="all" className="bg-[#121212] text-white">All Orders (excl. Cancelled)</option>
              </select>
            </div>
          </div>

          {selectedParentCategoryId === null ? (
            /* Parent Categories List */
            <div className="flex flex-col gap-4">
              <div className="px-1"><h3 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Parent Categories</h3></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ratioData.map(parent => (
                  <button
                    key={parent.id}
                    onClick={() => setSelectedParentCategoryId(parent.id)}
                    className="glass-panel border border-[var(--panel-border)] hover:border-accent/40 rounded-3xl p-5 text-left flex items-center justify-between group transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                        <FolderOpen className="text-accent" size={20} />
                      </div>
                      <div>
                        <h4 className="font-black text-base text-white group-hover:text-accent transition-colors">{parent.name}</h4>
                        <p className="text-xs text-[var(--muted)] font-bold">{parent.totalQty} items ordered</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-[var(--muted)] group-hover:text-accent transition-colors" />
                  </button>
                ))}
                {ratioData.length === 0 && (
                  <p className="text-sm text-[var(--muted)] italic col-span-full text-center py-10">No categories found.</p>
                )}
              </div>
            </div>
          ) : (() => {
            const parentCat = ratioData.find(p => p.id === selectedParentCategoryId);
            if (!parentCat) return null;

            return (
              <div className="flex flex-col gap-6">
                {/* Back & Breadcrumb Row */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <button
                    onClick={() => {
                      setSelectedParentCategoryId(null);
                      setCategoryViewTab('products');
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--panel-bg)] hover:bg-[var(--panel-bg-hover)] border border-[var(--panel-border)] text-xs font-bold text-white hover:text-accent rounded-xl transition-all"
                  >
                    <ArrowLeft size={14} /> Back to Categories
                  </button>
                  <div className="flex items-center gap-2">
                    <PieChart size={16} className="text-accent" />
                    <span className="text-sm font-black text-white">{parentCat.name}</span>
                    <span className="text-xs text-[var(--muted)] font-bold">({parentCat.totalQty} pcs total)</span>
                  </div>
                </div>

                {/* Sub-Tab Switcher */}
                <div className="flex gap-1.5 p-1 bg-[var(--panel-bg)] rounded-xl border border-[var(--panel-border)] w-fit shrink-0">
                  <button
                    onClick={() => setCategoryViewTab('products')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                      categoryViewTab === 'products' ? 'bg-accent text-black shadow-sm' : 'text-[var(--muted)] hover:text-foreground'
                    }`}
                  >
                    🛍️ Products
                  </button>
                  <button
                    onClick={() => setCategoryViewTab('demographics')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                      categoryViewTab === 'demographics' ? 'bg-accent text-black shadow-sm' : 'text-[var(--muted)] hover:text-foreground'
                    }`}
                  >
                    📍 Demographics
                  </button>
                </div>

                {categoryViewTab === 'products' ? (
                  /* Subcategories Products Detail */
                  <div className="flex flex-col gap-6">
                    {parentCat.subCategories.map((sub: any) => (
                      <div key={sub.id} className="glass-panel border border-[var(--panel-border)] rounded-3xl p-5 md:p-6 flex flex-col gap-5 bg-black/10">
                        {/* Subcategory Header */}
                        <div className="flex items-center justify-between border-b border-[var(--panel-border)]/50 pb-3">
                          <div className="flex items-center gap-2">
                            <Tag size={15} className="text-purple-400" />
                            <h3 className="font-black text-base md:text-lg text-white">{sub.name}</h3>
                          </div>
                          <span className="text-xs font-black bg-purple-500/10 text-purple-400 border border-purple-500/20 px-3 py-1 rounded-full">
                            {sub.totalQty} pcs ({Math.round(sub.ratioInParent * 100)}% of parent)
                          </span>
                        </div>

                        {/* Products List under this subcategory */}
                        <div className="flex flex-col gap-6 divide-y divide-[var(--panel-border)]/30">
                          {sub.products.map((prod: any, pIdx: number) => (
                            <div key={prod.id} className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${pIdx > 0 ? 'pt-5' : ''}`}>
                              {/* Product Info & Thumbnail */}
                              <div className="flex items-center gap-4 min-w-[240px] max-w-md">
                                {prod.mainImage ? (
                                  <img src={prod.mainImage} alt={prod.name} className="w-12 h-14 rounded-xl object-cover bg-neutral-900 border border-white/10 shrink-0" />
                                ) : (
                                  <div className="w-12 h-14 rounded-xl bg-neutral-900 border border-white/10 flex items-center justify-center shrink-0">
                                    <ShoppingBag size={16} className="text-[var(--muted)]" />
                                  </div>
                                )}
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-bold text-sm text-white line-clamp-2">{prod.name}</span>
                                  <span className="text-xs text-[var(--muted)] font-bold">
                                    Total: {prod.totalQty} pcs ({Math.round(prod.ratioInSub * 100)}% of subcategory)
                                  </span>
                                </div>
                              </div>

                              {/* Sizes breakdown with progress bars */}
                              <div className="flex flex-col gap-2 flex-1 max-w-xl">
                                {prod.sizes.map((size: any) => (
                                  <div key={size.label} className="flex items-center gap-3">
                                    <span className="font-mono text-xs text-[var(--muted)] w-8 text-right font-black">{size.label}</span>
                                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                      <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${size.ratio * 100}%` }}></div>
                                    </div>
                                    <span className="text-xs font-black text-white w-12 text-right">{size.qty} pcs</span>
                                    <span className="text-[10px] text-[var(--muted)] w-10 text-right">({Math.round(size.ratio * 100)}%)</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                          {sub.products.length === 0 && (
                            <p className="text-sm text-[var(--muted)] italic">No products ordered in this subcategory.</p>
                          )}
                        </div>
                      </div>
                    ))}
                    {parentCat.subCategories.length === 0 && (
                      <div className="glass-panel border border-[var(--panel-border)] rounded-3xl p-10 text-center">
                        <p className="text-sm text-[var(--muted)] italic">No orders found for this category under the selected filter status.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Demographics View */
                  demographicData.length === 0 ? (
                    <div className="glass-panel border border-[var(--panel-border)] rounded-3xl p-10 text-center">
                      <p className="text-sm text-[var(--muted)] italic">No orders found for this category from any location.</p>
                    </div>
                  ) : (
                    <div className="glass-panel border border-[var(--panel-border)] rounded-3xl p-5 md:p-6 flex flex-col gap-5 bg-black/10">
                      <div className="border-b border-[var(--panel-border)]/50 pb-3 flex justify-between items-center">
                        <h3 className="font-black text-base text-white">Geographic Order Distribution</h3>
                        <span className="text-xs text-[var(--muted)] font-bold">Total: {totalDemographicQty} pcs</span>
                      </div>

                      <div className="flex flex-col gap-4">
                        {demographicData.map((item) => {
                          let displayName = item.district;
                          if (displayName.startsWith("Dhaka (Suburbs")) {
                            displayName = "Dhaka (Suburbs)";
                          }
                          const percentage = totalDemographicQty > 0 ? (item.qty / totalDemographicQty) * 100 : 0;

                          return (
                            <div key={item.district} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white/2 border border-white/5 rounded-2xl hover:bg-white/5 transition-all">
                              <div className="flex items-center gap-3 min-w-[200px]">
                                <MapPin size={16} className="text-accent" />
                                <div className="flex flex-col">
                                  <span className="font-bold text-sm text-white">{displayName}</span>
                                  <span className="text-xs text-[var(--muted)]">{item.orderCount} {item.orderCount === 1 ? 'order' : 'orders'}</span>
                                </div>
                              </div>

                              <div className="flex-1 max-w-lg flex items-center gap-3">
                                <div className="flex-1 h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5 relative">
                                  <div 
                                    className="h-full bg-accent rounded-full transition-all duration-500" 
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <span className="text-xs font-black text-white w-14 text-right">{item.qty} pcs</span>
                                <span className="text-[10px] text-[var(--muted)] w-10 text-right">({Math.round(percentage)}%)</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Product Selector Modal ── */}
      {selectorItemIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/25">
              <h3 className="font-black text-sm text-white flex items-center gap-2">
                <ShoppingBag size={16} className="text-accent" />
                {selectorItemIndex === 'new' ? 'Add Item to Order' : 'Change Order Item Product'}
              </h3>
              <button
                type="button"
                onClick={() => setSelectorItemIndex(null)}
                className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Breadcrumb Steps */}
            <div className="px-6 py-3 bg-black/10 border-b border-white/5 flex items-center gap-2 overflow-x-auto hide-scrollbar select-none text-[10px] uppercase font-black tracking-wider text-zinc-500">
              <button
                type="button"
                onClick={() => { setSelectorParentId(null); setSelectorSubId(null); setSelectorProductId(null); setSelectorSize(null); }}
                className={`transition-colors shrink-0 ${selectorParentId === null ? 'text-accent' : 'hover:text-white'}`}
              >
                1. Parent Category
              </button>
              {selectorParentId && (
                <>
                  <ChevronRight size={10} className="shrink-0 text-zinc-600" />
                  <button
                    type="button"
                    onClick={() => { setSelectorSubId(null); setSelectorProductId(null); setSelectorSize(null); }}
                    className={`transition-colors shrink-0 ${selectorSubId === null ? 'text-accent' : 'hover:text-white'}`}
                  >
                    2. Sub-Category
                  </button>
                </>
              )}
              {selectorSubId && (
                <>
                  <ChevronRight size={10} className="shrink-0 text-zinc-600" />
                  <button
                    type="button"
                    onClick={() => { setSelectorProductId(null); setSelectorSize(null); }}
                    className={`transition-colors shrink-0 ${selectorProductId === null ? 'text-accent' : 'hover:text-white'}`}
                  >
                    3. Product
                  </button>
                </>
              )}
              {selectorProductId && (
                <>
                  <ChevronRight size={10} className="shrink-0 text-zinc-600" />
                  <span className="text-accent shrink-0 font-black">4. Size & Qty</span>
                </>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 hide-scrollbar bg-black/5">
              {/* Step 1: Select Parent Category */}
              {selectorParentId === null && (
                <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                  <p className="text-xs text-[var(--muted)] font-black uppercase tracking-wider">Select Parent Category</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {categories.filter(c => !c.parentId).map(cat => {
                      // Get number of products in this parent cat or its subcats
                      const childIds = categories.filter(c => c.parentId === cat.id).map(c => c.id);
                      const catProductsCount = allProducts.filter(p => p.categoryId === cat.id || childIds.includes(p.categoryId)).length;

                      return (
                        <button
                          type="button"
                          key={cat.id}
                          onClick={() => {
                            setSelectorParentId(cat.id);
                            // If this parent category has no subcategories, skip subcategory step
                            const hasSubcats = categories.some(c => c.parentId === cat.id);
                            if (!hasSubcats) {
                              setSelectorSubId('direct');
                            }
                          }}
                          className="glass-panel border border-white/10 hover:border-accent/30 rounded-2xl p-4 text-left flex items-center gap-4 transition-all group hover:bg-white/3"
                        >
                          <div className="w-10 h-10 rounded-xl bg-accent/5 border border-accent/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300">
                            <FolderOpen size={16} className="text-accent" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-sm text-white group-hover:text-accent transition-colors truncate">{cat.name}</p>
                            <p className="text-[10px] text-[var(--muted)] font-bold">{catProductsCount} products available</p>
                          </div>
                          <ChevronRight size={16} className="text-zinc-500 group-hover:text-accent transition-colors shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 2: Select Subcategory */}
              {selectorParentId !== null && selectorSubId === null && (
                <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-[var(--muted)] font-black uppercase tracking-wider">Select Subcategory</p>
                    <button
                      type="button"
                      onClick={() => setSelectorParentId(null)}
                      className="text-[10px] text-accent font-black hover:underline"
                    >
                      ← Back to Parent Categories
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Add "Direct Parent products" option if there are products in parent itself */}
                    {allProducts.some(p => p.categoryId === selectorParentId) && (
                      <button
                        type="button"
                        onClick={() => setSelectorSubId('direct')}
                        className="glass-panel border border-accent hover:bg-accent/10 border-accent/30 shadow-[0_0_15px_rgba(0,255,65,0.15)] rounded-2xl p-4 text-left flex items-center gap-4 transition-all group hover:scale-[1.01]"
                      >
                        <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center shrink-0">
                          <Tag size={16} className="text-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-sm text-white truncate">General / Uncategorized</p>
                          <p className="text-[10px] text-accent font-black">Highlighted Category</p>
                        </div>
                        <ChevronRight size={16} className="text-accent shrink-0" />
                      </button>
                    )}

                    {categories.filter(c => c.parentId === selectorParentId).map(cat => {
                      const subProductsCount = allProducts.filter(p => p.categoryId === cat.id).length;
                      return (
                        <button
                          type="button"
                          key={cat.id}
                          onClick={() => setSelectorSubId(cat.id)}
                          className="glass-panel border border-accent/40 bg-accent/5 hover:bg-accent/10 shadow-[0_0_12px_rgba(0,255,65,0.1)] hover:shadow-[0_0_18px_rgba(0,255,65,0.2)] rounded-2xl p-4 text-left flex items-center gap-4 transition-all group hover:scale-[1.01] border-2"
                        >
                          <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                            <Tag size={16} className="text-accent" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-sm text-white truncate">{cat.name}</p>
                            <p className="text-[10px] text-accent font-black">{subProductsCount} products available</p>
                          </div>
                          <ChevronRight size={16} className="text-accent shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 3: Select Product */}
              {selectorParentId !== null && selectorSubId !== null && selectorProductId === null && (
                <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-[var(--muted)] font-black uppercase tracking-wider">Select Product</p>
                    <button
                      type="button"
                      onClick={() => setSelectorSubId(null)}
                      className="text-[10px] text-accent font-black hover:underline"
                    >
                      ← Back to Subcategories
                    </button>
                  </div>
                  
                  {filteredProducts.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-sm text-[var(--muted)] italic">No products found in this category.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {filteredProducts.map(prod => {
                        const priceRangeStr = (() => {
                          const prices = prod.sizes.map((s: any) => s.salePrice ?? s.basePrice);
                          if (prices.length === 0) return 'Price N/A';
                          const minPrice = Math.min(...prices);
                          const maxPrice = Math.max(...prices);
                          return minPrice === maxPrice ? `৳${minPrice.toLocaleString()}` : `৳${minPrice.toLocaleString()} - ৳${maxPrice.toLocaleString()}`;
                        })();

                        return (
                          <button
                            type="button"
                            key={prod.id}
                            onClick={() => {
                              setSelectorProductId(prod.id);
                              // Auto-select first size sorted smallest-to-largest
                              const sorted = sortSizes(prod.sizes || [], (s: any) => s.label);
                              setSelectorSize(sorted[0]?.label || null);
                            }}
                            className="glass-panel border border-white/10 hover:border-accent/30 rounded-2xl p-3 text-left flex gap-3 transition-all hover:bg-white/3"
                          >
                            {prod.mainImage ? (
                              <img src={prod.mainImage} alt={prod.name} className="w-12 h-14 object-cover rounded-xl bg-neutral-900 border border-white/5 shrink-0" />
                            ) : (
                              <div className="w-12 h-14 rounded-xl bg-neutral-900 border border-white/5 flex items-center justify-center shrink-0 text-zinc-500">
                                <Package size={16} />
                              </div>
                            )}
                            <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                              <p className="font-bold text-sm text-white truncate leading-snug">{prod.name}</p>
                              <p className="text-xs text-accent font-black">{priceRangeStr}</p>
                              <p className="text-[9px] text-[var(--muted)]">{prod.sizes?.length || 0} sizes available</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Size & Quantity */}
              {selectorParentId !== null && selectorSubId !== null && selectorProductId !== null && selectedProductDetails && (
                <div className="flex flex-col gap-6 animate-in fade-in duration-200">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <div>
                      <p className="text-[10px] text-[var(--muted)] font-black uppercase tracking-wider">Selected Product Details</p>
                      <h4 className="font-black text-base text-white mt-0.5">{selectedProductDetails.name}</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectorProductId(null)}
                      className="text-[10px] text-accent font-black hover:underline shrink-0"
                    >
                      ← Change Product
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-5">
                    {/* Thumbnail */}
                    {selectedProductDetails.mainImage && (
                      <div className="w-28 h-32 rounded-2xl overflow-hidden border border-white/10 bg-neutral-950 shrink-0 self-center sm:self-start">
                        <img src={selectedProductDetails.mainImage} alt={selectedProductDetails.name} className="w-full h-full object-cover" />
                      </div>
                    )}

                    <div className="flex-1 flex flex-col gap-4">
                      {/* Sizes selection grid */}
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] text-[var(--muted)] font-black uppercase tracking-wider">Select Size</label>
                        <div className="flex flex-wrap gap-2.5">
                          {sortedProductSizes.map(s => {
                            const isSelected = selectorSize === s.label;
                            const isOutOfStock = s.quantity <= 0;
                            return (
                              <button
                                type="button"
                                key={s.id || s.label}
                                onClick={() => setSelectorSize(s.label)}
                                className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center min-w-[3.5rem] border ${
                                  isSelected
                                    ? 'bg-accent text-black border-accent shadow-md shadow-accent/25'
                                    : 'bg-[var(--panel-bg)] text-[var(--muted)] border-white/10 hover:border-white/30 hover:text-white'
                                }`}
                              >
                                <span>{s.label}</span>
                                <span className={`text-[8px] mt-0.5 ${isSelected ? 'text-black/75' : isOutOfStock ? 'text-red-400' : 'text-[var(--muted)]'}`}>
                                  {isOutOfStock ? 'Out of Stock' : `Qty: ${s.quantity}`}
                                </span>
                              </button>
                            );
                          })}
                          {sortedProductSizes.length === 0 && (
                            <p className="text-xs text-[var(--muted)] italic">No sizes configured for this product.</p>
                          )}
                        </div>
                      </div>

                      {/* Quantity Selector */}
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] text-[var(--muted)] font-black uppercase tracking-wider">Enter Quantity</label>
                        <div className="flex items-center w-fit bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setSelectorQuantity(q => Math.max(1, q - 1))}
                            className="w-10 h-9 flex items-center justify-center text-[var(--muted)] hover:bg-white/5 hover:text-foreground transition-colors font-bold select-none text-sm"
                          >
                            -
                          </button>
                          <span className="w-12 text-center font-black text-sm text-white">{selectorQuantity}</span>
                          <button
                            type="button"
                            onClick={() => setSelectorQuantity(q => q + 1)}
                            className="w-10 h-9 flex items-center justify-center text-accent hover:bg-white/5 transition-colors font-bold select-none text-sm"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pricing feedback info */}
                  {(() => {
                    const matchedSize = selectedProductDetails.sizes?.find((s: any) => s.label === selectorSize);
                    if (!matchedSize) return null;
                    const price = matchedSize.salePrice ?? matchedSize.basePrice;
                    return (
                      <div className="bg-white/2 border border-white/5 p-4 rounded-2xl flex items-center justify-between text-xs">
                        <div>
                          <p className="text-[9px] text-[var(--muted)] font-black uppercase tracking-wider">Unit Price</p>
                          <p className="text-sm font-black text-accent mt-0.5">৳{price.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] text-[var(--muted)] font-black uppercase tracking-wider">Item Subtotal</p>
                          <p className="text-base font-black text-white mt-0.5">৳{(price * selectorQuantity).toLocaleString()}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div className="p-4 border-t border-white/10 bg-black/25 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSelectorItemIndex(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs rounded-xl transition-all"
              >
                Close ❌
              </button>
              {selectorProductId && selectorSize && (
                <button
                  type="button"
                  onClick={confirmSelectorSelection}
                  className="px-5 py-2 bg-accent hover:brightness-110 text-black font-black text-xs rounded-xl transition-all shadow-md shadow-accent/15 select-none"
                >
                  {selectorItemIndex === 'new' ? 'Add Item ➕' : 'Update Item ✅'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, color, bg, border, icon: Icon }: {
  label: string; value: string; sub: string; color: string; bg: string; border: string; icon: any;
}) {
  return (
    <div className={`glass-panel rounded-2xl p-4 flex flex-col gap-2 border ${border}`}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] leading-tight">{label}</p>
        <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center border ${border} shrink-0`}>
          <Icon size={14} className={color} />
        </div>
      </div>
      <p className={`text-xl font-black ${color}`}>{value}</p>
      <p className="text-[10px] text-[var(--muted)]">{sub}</p>
    </div>
  );
}
