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

export function CookDashboard({ user }: CookDashboardProps) {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
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

      setPedidos(pedidosWithItems);
      setProductos(productosData.productos || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cambia TODOS los items de un pedido a un estado específico
  const updateAllItemsStatus = async (pedido: any, newEstado: string) => {
    try {
      await Promise.all(
        pedido.items.map((item: any) =>
          fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-402bd9dc/pedido-items/${item.id}`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${publicAnonKey}`,
              },
              body: JSON.stringify({ estado: newEstado }),
            }
          )
        )
      );

      toast.success(`Pedido marcado como ${newEstado}`);
      loadData();
    } catch (error) {
      console.error("Error updating all items:", error);
      toast.error("Error al actualizar el pedido");
    }
  };

  // Asignar pedido al cocinero
  const handleAssignOrder = async (pedido: any) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-402bd9dc/pedidos/${pedido.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ cocinero_id: user.id }),
        }
      );

      if (!response.ok) {
        throw new Error('Error al asignar pedido');
      }

      toast.success('Pedido tomado');
      loadData();
    } catch (error) {
      console.error('Error assigning order:', error);
      toast.error('Error al asignar pedido');
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

  // Detectar el estado general del pedido
  const getNextOrderState = (pedido: any) => {
    const allPending = pedido.items.every((i: any) => i.estado === "pendiente");
    const allPreparing = pedido.items.every((i: any) => i.estado === "preparando");

    if (allPending) return "preparando";
    if (allPreparing) return "listo";

    return "listo";
  };

  const getOrderButtonText = (pedido: any) => {
    const allPending = pedido.items.every((i: any) => i.estado === "pendiente");
    const allPreparing = pedido.items.every((i: any) => i.estado === "preparando");

    if (allPending) return "Iniciar preparación";
    if (allPreparing) return "Marcar listo";

    return "Listo";
  };

  if (loading) {
    return <div className="text-center py-8">Cargando pedidos...</div>;
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pedidos.map((pedido) => (
          <Card key={pedido.id} className="border-l-4 border-l-orange-500">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Mesa {pedido.mesa}</CardTitle>
                  <CardDescription>
                    {new Date(pedido.hora).toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </CardDescription>
                </div>

                {/* BOTÓN PRINCIPAL */}
                <Button
                  size="sm"
                  onClick={async () => {
                    // Primero asigna el pedido al cocinero
                    await handleAssignOrder(pedido);

                    // Luego cambia todos los estados
                    const nextState = getNextOrderState(pedido);
                    await updateAllItemsStatus(pedido, nextState);
                  }}
                >
                  {getOrderButtonText(pedido)}
                </Button>
              </div>
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
        ))}
      </div>
    </div>
  );
}
