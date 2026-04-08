import { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { TrendingUp, ShoppingCart, DollarSign, Package, Calendar } from 'lucide-react';
import { Card } from '../components/ui/card';

interface Order {
  id: string;
  product: string;
  quantity: number;
  notes: string;
  status: string;
  createdAt: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  createdAt: string;
}

export function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-3b443693`;

  const fetchData = async () => {
    try {
      const [ordersRes, productsRes] = await Promise.all([
        fetch(`${API_URL}/orders`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        }),
        fetch(`${API_URL}/products`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        }),
      ]);

      const ordersData = await ordersRes.json();
      const productsData = await productsRes.json();

      setOrders(ordersData.orders);
      setProducts(productsData.products);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Filter orders from today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayOrders = orders.filter(order => {
    const orderDate = new Date(order.createdAt);
    orderDate.setHours(0, 0, 0, 0);
    return orderDate.getTime() === today.getTime();
  });

  // Calculate statistics
  const totalOrdersToday = todayOrders.length;
  const completedOrdersToday = todayOrders.filter(o => o.status === 'completed').length;
  const pendingOrdersToday = todayOrders.filter(o => o.status === 'pending').length;

  // Calculate revenue
  const calculateRevenue = () => {
    let total = 0;
    todayOrders.forEach(order => {
      const product = products.find(p => p.name === order.product);
      if (product) {
        total += product.price * order.quantity;
      }
    });
    return total;
  };

  const totalRevenueToday = calculateRevenue();

  // Top selling products today
  const getTopProducts = () => {
    const productCount: { [key: string]: { count: number; revenue: number } } = {};
    
    todayOrders.forEach(order => {
      const product = products.find(p => p.name === order.product);
      if (!productCount[order.product]) {
        productCount[order.product] = { count: 0, revenue: 0 };
      }
      productCount[order.product].count += order.quantity;
      if (product) {
        productCount[order.product].revenue += product.price * order.quantity;
      }
    });

    return Object.entries(productCount)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const topProducts = getTopProducts();

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 dark:border-blue-400 border-r-transparent"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Carregando dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 transition-colors">
        <div className="flex items-center gap-3 mb-2">
          <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">
            Dashboard - Hoje
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          {new Date().toLocaleDateString('pt-BR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Orders */}
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium mb-1">Total de Pedidos</p>
              <p className="text-4xl font-bold">{totalOrdersToday}</p>
            </div>
            <ShoppingCart className="w-12 h-12 text-blue-200" />
          </div>
        </Card>

        {/* Completed Orders */}
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium mb-1">Pedidos Concluídos</p>
              <p className="text-4xl font-bold">{completedOrdersToday}</p>
            </div>
            <Package className="w-12 h-12 text-green-200" />
          </div>
        </Card>

        {/* Pending Orders */}
        <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white p-6 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-yellow-100 text-sm font-medium mb-1">Pedidos Pendentes</p>
              <p className="text-4xl font-bold">{pendingOrdersToday}</p>
            </div>
            <TrendingUp className="w-12 h-12 text-yellow-200" />
          </div>
        </Card>

        {/* Total Revenue */}
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium mb-1">Lucro Total</p>
              <p className="text-4xl font-bold">R$ {totalRevenueToday.toFixed(2)}</p>
            </div>
            <DollarSign className="w-12 h-12 text-purple-200" />
          </div>
        </Card>
      </div>

      {/* Top Products */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 transition-colors">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">
          Top 5 Produtos do Dia
        </h2>
        
        {topProducts.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">Nenhum pedido hoje</p>
          </div>
        ) : (
          <div className="space-y-3">
            {topProducts.map((product, index) => (
              <div 
                key={product.name}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 font-bold">
                    #{index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-100 break-words">
                      {product.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {product.count} unidade{product.count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    R$ {product.revenue.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Auto-refresh indicator */}
      <div className="text-center text-sm text-gray-600 dark:text-gray-400">
        <p className="text-xs md:text-sm">🔄 Atualizando a cada 5 segundos</p>
      </div>
    </div>
  );
}
