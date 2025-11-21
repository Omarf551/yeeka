import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export function OrdersView() {
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
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-402bd9dc/productos`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }),
      ]);

      const pedidosData = await pedidosRes.json();
      const productosData = await productosRes.json();

      // Obtener items de cada pedido (con protección de errores)
      const pedidosWithItems = await Promise.all(
        (pedidosData.pedidos || []).map(async (pedido: any) => {
          try {
            const itemsRes = await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-402bd9dc/pedidos/${pedido.id}`,
              { headers: { Authorization: `Bearer ${publicAnonKey}` } }
            );

            // Si el pedido ya no existe → ignorarlo
            if (!itemsRes.ok) return null;

            const itemsData = await itemsRes.json();
            return itemsData.pedido;
          } catch (err) {
            console.error("Error loading items:", err);
            return null;
          }
        })
      );

      // Filtrar pedidos inexistentes
      setPedidos(pedidosWithItems.filter((p) => p !== null));
      setProductos(productosData.productos || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este pedido?')) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-402bd9dc/pedidos/${id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }
      );

      if (!response.ok) throw new Error('Error al eliminar pedido');

      toast.success('Pedido eliminado');
      loadData();
    } catch (error: any) {
      console.error('Error deleting pedido:', error);
      toast.error('Error al eliminar pedido');
    }
  };

  const getProductoName = (productoId: number) => {
    const producto = productos.find((p) => p.id === productoId);
    return producto ? producto.nombre : 'Producto desconocido';
  };

  const getEstadoBadge = (estado: string) => {
    const variants: any = {
      pendiente: 'default',
      entregado: 'default',
      preparando: 'default',
      listo: 'default',
    };

    const colors: any = {
      pendiente: 'bg-yellow-100 text-yellow-800',
      entregado: 'bg-green-100 text-green-800',
      preparando: 'bg-blue-100 text-blue-800',
      listo: 'bg-purple-100 text-purple-800',
    };

    return (
      <Badge variant={variants[estado]} className={colors[estado]}>
        {estado.charAt(0).toUpperCase() + estado.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return <div className="text-center py-8">Cargando pedidos...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-gray-900">Todos los Pedidos</h3>
          <p className="text-gray-600">Vista general de pedidos en el sistema</p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="size-4 mr-2" />
          Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pedidos.length === 0 ? (
          <p className="text-gray-500 text-center py-8 col-span-full">
            No hay pedidos registrados
          </p>
        ) : (
          pedidos.map((pedido) => (
            <Card key={pedido.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>Mesa {pedido.mesa}</CardTitle>
                    <CardDescription>
                      {new Date(pedido.hora).toLocaleString('es-ES')}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {getEstadoBadge(pedido.estado)}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(pedido.id)}
                    >
                      <Trash2 className="size-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-2">
                  {pedido.items && pedido.items.length > 0 ? (
                    pedido.items.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-center py-2 border-b last:border-b-0"
                      >
                        <div>
                          <span className="text-gray-900">
                            {item.cantidad}x {getProductoName(item.producto_id)}
                          </span>
                        </div>
                        {getEstadoBadge(item.estado)}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500">Sin items</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
