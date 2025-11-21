import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { RefreshCw, ChefHat } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface CookDashboardProps {
  user: any;
}

// Componente Skeleton estilo Facebook con shimmer
const Skeleton = ({ className }: { className?: string }) => (
  <div
    className={`relative overflow-hidden rounded ${className || ''}`}
    style={{ backgroundColor: '#e4e6e7' }}
  >
    <div
      className="absolute inset-0"
      style={{
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
        animation: 'shimmer 1.5s infinite',
      }}
    />
    <style>{`
      @keyframes shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
    `}</style>
  </div>
);

export function CookDashboard({ user }: CookDashboardProps) {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingOrders, setProcessingOrders] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    // No cargar si hay pedidos procesándose
    if (processingOrders.size > 0) return;
    
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

      const pendingOrders = (pedidosData.pedidos || []).filter(
        (p: any) => p.estado === 'pendiente'
      );

      const pedidosWithItems = await Promise.all(
        pendingOrders.map(async (pedido: any) => {
          const itemsRes = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-402bd9dc/pedidos/${pedido.id}`,
            { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
          );
          const itemsData = await itemsRes.json();
          return itemsData.pedido;
        })
      );

      // Filtrar: mostrar pedidos donde NO todos los items estén "listo"
      const activePedidos = pedidosWithItems.filter((pedido: any) => {
        if (!pedido.items || pedido.items.length === 0) return false;
        const allListo = pedido.items.every((item: any) => item.estado === 'listo');
        return !allListo;
      });

      setPedidos(activePedidos);
      setProductos(productosData.productos || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOrderAction = async (pedido: any) => {
    const allPending = pedido.items?.every((i: any) => i.estado === 'pendiente');
    const nextState = allPending ? 'preparando' : 'listo';
    const pedidoId = pedido.id;
    
    setProcessingOrders(prev => new Set(prev).add(pedidoId));
    
    // Actualización optimista
    if (nextState === 'listo') {
      setPedidos(prev => prev.filter(p => p.id !== pedidoId));
    } else {
      setPedidos(prev => prev.map(p => {
        if (p.id !== pedidoId) return p;
        return {
          ...p,
          items: p.items.map((item: any) => ({ ...item, estado: nextState }))
        };
      }));
    }

    try {
      await Promise.all([
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-402bd9dc/pedidos/${pedidoId}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({ cocinero_id: user.id }),
          }
        ),
        ...pedido.items.map((item: any) =>
          fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-402bd9dc/pedido-items/${item.id}`,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${publicAnonKey}`,
              },
              body: JSON.stringify({ estado: nextState }),
            }
          )
        ),
      ]);

      toast.success(
        nextState === 'listo' 
          ? '¡Pedido listo! Enviado al cajero' 
          : 'Preparando pedido...'
      );
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Error al actualizar el pedido');
      loadData();
    } finally {
      setProcessingOrders(prev => {
        const next = new Set(prev);
        next.delete(pedidoId);
        return next;
      });
    }
  };

  const getProductoName = (productoId: number) => {
    const producto = productos.find(p => p.id === productoId);
    return producto ? producto.nombre : 'Producto desconocido';
  };

  const getEstadoColor = (estado: string) => {
    const colors: any = {
      pendiente: 'bg-yellow-100 text-yellow-800',
      preparando: 'bg-blue-100 text-blue-800',
      listo: 'bg-green-100 text-green-800',
    };
    return colors[estado] || 'bg-gray-100 text-gray-800';
  };

  // Determinar si el pedido está en estado "preparando"
  const isPreparing = (pedido: any) => {
    return pedido.items?.every((i: any) => i.estado === 'preparando');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-2 rounded-full">
              <ChefHat className="size-6 text-orange-600" />
            </div>
            <div>
              <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mt-1" />
            </div>
          </div>
          <div className="h-9 w-24 bg-gray-200 rounded animate-pulse" />
        </div>

        {/* Cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-l-4 border-l-gray-300">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
                  <div className="h-9 w-24 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse mt-2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[1, 2].map((j) => (
                    <div key={j} className="p-3 border rounded-lg flex justify-between items-center">
                      <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                      <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-orange-100 p-2 rounded-full">
            <ChefHat className="size-6 text-orange-600" />
          </div>
          <div>
            <h2 className="text-gray-900">Cocina - Pedidos Activos</h2>
            <p className="text-gray-600">{pedidos.length} pedidos pendientes</p>
          </div>
        </div>
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="size-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {pedidos.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <ChefHat className="size-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No hay pedidos pendientes</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pedidos.map((pedido) => {
            const preparing = isPreparing(pedido);
            const isProcessing = processingOrders.has(pedido.id);
            
            return (
              <Card 
                key={pedido.id} 
                className={`border-l-4 ${preparing ? 'border-l-blue-500' : 'border-l-orange-500'}`}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex justify-between items-center">
                    <span>Mesa {pedido.mesa}</span>
                    
                    {/* BOTÓN SIEMPRE VISIBLE */}
                    {preparing ? (
                      <button
                        disabled={isProcessing}
                        onClick={() => handleOrderAction(pedido)}
                        style={{
                          backgroundColor: '#16a34a',
                          color: 'white',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: 500,
                          cursor: isProcessing ? 'not-allowed' : 'pointer',
                          opacity: isProcessing ? 0.6 : 1,
                        }}
                      >
                        {isProcessing ? 'Procesando...' : '✓ Marcar listo'}
                      </button>
                    ) : (
                      <button
                        disabled={isProcessing}
                        onClick={() => handleOrderAction(pedido)}
                        style={{
                          backgroundColor: '#2563eb',
                          color: 'white',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: 500,
                          cursor: isProcessing ? 'not-allowed' : 'pointer',
                          opacity: isProcessing ? 0.6 : 1,
                        }}
                      >
                        {isProcessing ? 'Procesando...' : 'Iniciar'}
                      </button>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {new Date(pedido.hora).toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="space-y-3">
                    {pedido.items?.map((item: any) => (
                      <div
                        key={item.id}
                        className="p-3 border rounded-lg flex justify-between items-center"
                      >
                        <span>{item.cantidad}x {getProductoName(item.producto_id)}</span>
                        <Badge className={getEstadoColor(item.estado)}>
                          {item.estado}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}