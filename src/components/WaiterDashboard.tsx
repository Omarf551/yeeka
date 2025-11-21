import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Plus, Minus, ShoppingCart, RefreshCw } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface WaiterDashboardProps {
  user: any;
}

export function WaiterDashboard({ user }: WaiterDashboardProps) {
  const [productos, setProductos] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [cart, setCart] = useState<{ [key: number]: number }>({});
  const [mesa, setMesa] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadPedidos, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [productosRes, categoriasRes] = await Promise.all([
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-402bd9dc/productos`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-402bd9dc/categorias`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        }),
      ]);

      const productosData = await productosRes.json();
      const categoriasData = await categoriasRes.json();

      setProductos(productosData.productos || []);
      setCategorias(categoriasData.categorias || []);
      
      await loadPedidos();
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const loadPedidos = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-402bd9dc/pedidos`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );

      const data = await response.json();
      
      // Filter only this waiter's orders
      const waiterPedidos = (data.pedidos || []).filter(
        (p: any) => p.mesero_id === user.id
      );
      
      setPedidos(waiterPedidos);
    } catch (error) {
      console.error('Error loading pedidos:', error);
    }
  };

  const addToCart = (productoId: number) => {
    setCart(prev => ({
      ...prev,
      [productoId]: (prev[productoId] || 0) + 1
    }));
  };

  const removeFromCart = (productoId: number) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[productoId] > 1) {
        newCart[productoId]--;
      } else {
        delete newCart[productoId];
      }
      return newCart;
    });
  };

  const handleCreateOrder = async () => {
    if (!mesa.trim()) {
      toast.error('Por favor ingresa el número de mesa');
      return;
    }

    if (Object.keys(cart).length === 0) {
      toast.error('Agrega al menos un producto al pedido');
      return;
    }

    setCreating(true);

    try {
      const items = Object.entries(cart).map(([productoId, cantidad]) => ({
        producto_id: parseInt(productoId),
        cantidad
      }));

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-402bd9dc/pedidos`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            mesa,
            mesero_id: user.id,
            items
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Error al crear pedido');
      }

      toast.success('Pedido creado exitosamente');
      setCart({});
      setMesa('');
      loadPedidos();
    } catch (error: any) {
      console.error('Error creating order:', error);
      toast.error('Error al crear pedido');
    } finally {
      setCreating(false);
    }
  };

  const getCategoriaName = (categoriaId: number | null) => {
    if (!categoriaId) return 'Sin categoría';
    const categoria = categorias.find(c => c.id === categoriaId);
    return categoria ? categoria.nombre : 'Sin categoría';
  };

  const getCartTotal = () => {
    return Object.entries(cart).reduce((total, [productoId, cantidad]) => {
      const producto = productos.find(p => p.id === parseInt(productoId));
      return total + (producto ? producto.precio * cantidad : 0);
    }, 0);
  };

  const getCartItemsCount = () => {
    return Object.values(cart).reduce((sum, cant) => sum + cant, 0);
  };

  if (loading) {
    return <div className="text-center py-8">Cargando...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Products Section */}
      <div className="lg:col-span-2 space-y-6">
        <div>
          <h2 className="text-gray-900 mb-2">Menú de Productos</h2>
          <p className="text-gray-600">Selecciona productos para crear un pedido</p>
        </div>

        {categorias.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-gray-500 text-center">No hay productos disponibles</p>
            </CardContent>
          </Card>
        ) : (
          categorias.map((categoria) => {
            const categoryProducts = productos.filter(
              p => p.categoria_id === categoria.id
            );

            if (categoryProducts.length === 0) return null;

            return (
              <Card key={categoria.id}>
                <CardHeader>
                  <CardTitle>{categoria.nombre}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {categoryProducts.map((producto) => (
                      <div
                        key={producto.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <p className="text-gray-900">{producto.nombre}</p>
                          <p className="text-gray-600">
                            ${producto.precio.toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {cart[producto.id] ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => removeFromCart(producto.id)}
                              >
                                <Minus className="size-4" />
                              </Button>
                              <span className="text-gray-900 min-w-[2rem] text-center">
                                {cart[producto.id]}
                              </span>
                              <Button
                                size="sm"
                                onClick={() => addToCart(producto.id)}
                              >
                                <Plus className="size-4" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => addToCart(producto.id)}
                            >
                              <Plus className="size-4 mr-1" />
                              Agregar
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}

        {/* Uncategorized products */}
        {productos.filter(p => !p.categoria_id).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Otros Productos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {productos
                  .filter(p => !p.categoria_id)
                  .map((producto) => (
                    <div
                      key={producto.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="text-gray-900">{producto.nombre}</p>
                        <p className="text-gray-600">
                          ${producto.precio.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {cart[producto.id] ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => removeFromCart(producto.id)}
                            >
                              <Minus className="size-4" />
                            </Button>
                            <span className="text-gray-900 min-w-[2rem] text-center">
                              {cart[producto.id]}
                            </span>
                            <Button
                              size="sm"
                              onClick={() => addToCart(producto.id)}
                            >
                              <Plus className="size-4" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => addToCart(producto.id)}
                          >
                            <Plus className="size-4 mr-1" />
                            Agregar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Cart and Orders Section */}
      <div className="space-y-6">
        {/* Cart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="size-5" />
              Carrito ({getCartItemsCount()})
            </CardTitle>
            <CardDescription>Pedido actual</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mesa">Número de Mesa</Label>
              <Input
                id="mesa"
                value={mesa}
                onChange={(e) => setMesa(e.target.value)}
                placeholder="Ej: 5"
              />
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {Object.keys(cart).length === 0 ? (
                <p className="text-gray-500 text-center py-4">Carrito vacío</p>
              ) : (
                Object.entries(cart).map(([productoId, cantidad]) => {
                  const producto = productos.find(p => p.id === parseInt(productoId));
                  if (!producto) return null;

                  return (
                    <div
                      key={productoId}
                      className="flex justify-between items-center py-2 border-b"
                    >
                      <div className="flex-1">
                        <p className="text-gray-900">{producto.nombre}</p>
                        <p className="text-gray-600">
                          ${producto.precio.toFixed(2)} x {cantidad}
                        </p>
                      </div>
                      <p className="text-gray-900">
                        ${(producto.precio * cantidad).toFixed(2)}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            {Object.keys(cart).length > 0 && (
              <>
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-900">Total:</span>
                    <span className="text-gray-900">${getCartTotal().toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={handleCreateOrder}
                  disabled={creating}
                >
                  {creating ? 'Creando...' : 'Crear Pedido'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* My Orders */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Mis Pedidos</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadPedidos}
              >
                <RefreshCw className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {pedidos.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Sin pedidos</p>
              ) : (
                pedidos.map((pedido) => (
                  <div
                    key={pedido.id}
                    className="p-3 border rounded-lg"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-gray-900">Mesa {pedido.mesa}</p>
                        <p className="text-gray-600">
                          {new Date(pedido.hora).toLocaleTimeString('es-ES')}
                        </p>
                      </div>
                      <Badge
                        className={
                          pedido.estado === 'entregado'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }
                      >
                        {pedido.estado}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
