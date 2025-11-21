import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { RefreshCw, DollarSign, CheckCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface CashierDashboardProps {
  user: any;
}

export function CashierDashboard({ user }: CashierDashboardProps) {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [pedidosRes, productosRes] = await Promise.all([
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-402bd9dc/pedidos`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-402bd9dc/productos`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        }),
      ]);

      const pedidosData = await pedidosRes.json();
      const productosData = await productosRes.json();

      // Get items for all orders
      const pedidosWithItems = await Promise.all(
        (pedidosData.pedidos || []).map(async (pedido: any) => {
          const itemsRes = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-402bd9dc/pedidos/${pedido.id}`,
            { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
          );
          const itemsData = await itemsRes.json();
          return itemsData.pedido;
        })
      );

      setPedidos(pedidosWithItems);
      setProductos(productosData.productos || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsDelivered = async (pedidoId: number) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-402bd9dc/pedidos/${pedidoId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ estado: 'entregado' }),
        }
      );

      if (!response.ok) {
        throw new Error('Error al marcar pedido como entregado');
      }

      toast.success('Pedido marcado como entregado');
      loadData();
    } catch (error: any) {
      console.error('Error updating order:', error);
      toast.error('Error al actualizar pedido');
    }
  };

  const getProductoInfo = (productoId: number) => {
    return productos.find(p => p.id === productoId);
  };

  const calculateOrderTotal = (items: any[]) => {
    return items.reduce((total, item) => {
      const producto = getProductoInfo(item.producto_id);
      return total + (producto ? producto.precio * item.cantidad : 0);
    }, 0);
  };

  const allItemsReady = (items: any[]) => {
    return items.every(item => item.estado === 'listo');
  };

  const pendingOrders = pedidos.filter(p => p.estado === 'pendiente');
  const deliveredOrders = pedidos.filter(p => p.estado === 'entregado');

  const todayTotal = deliveredOrders.reduce((sum, pedido) => {
    return sum + calculateOrderTotal(pedido.items || []);
  }, 0);

  if (loading) {
    return <div className="text-center py-8">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-green-100 p-2 rounded-full">
            <DollarSign className="size-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-gray-900">Caja - Control de Pedidos</h2>
            <p className="text-gray-600">
              {pendingOrders.length} pedido{pendingOrders.length !== 1 ? 's' : ''} activo
              {pendingOrders.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="size-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardDescription>Total del Día</CardDescription>
            <CardTitle className="text-green-600">${todayTotal.toFixed(2)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Pedidos Activos</CardDescription>
            <CardTitle className="text-orange-600">{pendingOrders.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Pedidos Entregados</CardDescription>
            <CardTitle className="text-green-600">{deliveredOrders.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Pending Orders */}
      <div>
        <h3 className="text-gray-900 mb-4">Pedidos Pendientes</h3>
        {pendingOrders.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-gray-500 text-center">No hay pedidos pendientes</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingOrders.map((pedido) => {
              const total = calculateOrderTotal(pedido.items || []);
              const readyToDeliver = allItemsReady(pedido.items || []);

              return (
                <Card key={pedido.id} className={readyToDeliver ? 'border-l-4 border-l-green-500' : ''}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>Mesa {pedido.mesa}</CardTitle>
                        <CardDescription>
                          {new Date(pedido.hora).toLocaleString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </CardDescription>
                      </div>
                      {readyToDeliver && (
                        <Badge className="bg-green-100 text-green-800">
                          Listo
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      {pedido.items && pedido.items.length > 0 ? (
                        pedido.items.map((item: any) => {
                          const producto = getProductoInfo(item.producto_id);
                          if (!producto) return null;

                          return (
                            <div
                              key={item.id}
                              className="flex justify-between items-start text-sm"
                            >
                              <div className="flex-1">
                                <span className="text-gray-900">
                                  {item.cantidad}x {producto.nombre}
                                </span>
                                <Badge
                                  className={`ml-2 ${
                                    item.estado === 'listo'
                                      ? 'bg-green-100 text-green-800'
                                      : item.estado === 'preparando'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}
                                >
                                  {item.estado}
                                </Badge>
                              </div>
                              <span className="text-gray-600">
                                ${(producto.precio * item.cantidad).toFixed(2)}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-gray-500">Sin items</p>
                      )}
                    </div>

                    <div className="pt-4 border-t space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-900">Total:</span>
                        <span className="text-gray-900">${total.toFixed(2)}</span>
                      </div>

                      <Button
                        className="w-full"
                        disabled={!readyToDeliver}
                        onClick={() => handleMarkAsDelivered(pedido.id)}
                      >
                        <CheckCircle className="size-4 mr-2" />
                        {readyToDeliver ? 'Marcar como Entregado' : 'Esperando Cocina'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Delivered Orders */}
      <div>
        <h3 className="text-gray-900 mb-4">Pedidos Entregados Hoy</h3>
        {deliveredOrders.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-gray-500 text-center">No hay pedidos entregados</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {deliveredOrders.map((pedido) => {
              const total = calculateOrderTotal(pedido.items || []);

              return (
                <Card key={pedido.id}>
                  <CardContent className="py-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-gray-900">
                          Mesa {pedido.mesa} · {pedido.items?.length || 0} item
                          {(pedido.items?.length || 0) !== 1 ? 's' : ''}
                        </p>
                        <p className="text-gray-600">
                          {new Date(pedido.hora).toLocaleString('es-ES')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-900">${total.toFixed(2)}</p>
                        <Badge className="bg-green-100 text-green-800 mt-1">
                          Entregado
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
