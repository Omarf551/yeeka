import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { Plus, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export function ProductsManagement() {
  const [productos, setProductos] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [categoriaId, setCategoriaId] = useState<string>('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadData();
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
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-402bd9dc/productos`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            nombre,
            precio: parseFloat(precio),
            categoria_id: categoriaId !== "0" ? parseInt(categoriaId) : null,

          }),
        }
      );

      if (!response.ok) {
        throw new Error('Error al crear producto');
      }

      toast.success('Producto creado exitosamente');
      setNombre('');
      setPrecio('');
      setCategoriaId('');
      loadData();
    } catch (error: any) {
      console.error('Error creating producto:', error);
      toast.error('Error al crear producto');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-402bd9dc/productos/${id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Error al eliminar producto');
      }

      toast.success('Producto eliminado');
      loadData();
    } catch (error: any) {
      console.error('Error deleting producto:', error);
      toast.error('Error al eliminar producto');
    }
  };

  const getCategoriaName = (categoriaId: number | null) => {
    if (!categoriaId) return 'Sin categoría';
    const categoria = categorias.find(c => c.id === categoriaId);
    return categoria ? categoria.nombre : 'Sin categoría';
  };

  if (loading) {
    return <div className="text-center py-8">Cargando productos...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Crear Nuevo Producto</CardTitle>
          <CardDescription>Agrega un producto al menú</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre del Producto</Label>
                <Input
                  id="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Hamburguesa Clásica"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="precio">Precio</Label>
                <Input
                  id="precio"
                  type="number"
                  step="0.01"
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoría</Label>
                <Select value={categoriaId} onValueChange={setCategoriaId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sin categoría</SelectItem>
                    {categorias.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" disabled={creating}>
              <Plus className="size-4 mr-2" />
              {creating ? 'Creando...' : 'Crear Producto'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Productos en el Menú</CardTitle>
          <CardDescription>Lista de todos los productos disponibles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {productos.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No hay productos creados</p>
            ) : (
              productos.map((producto) => (
                <div
                  key={producto.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div>
                    <p className="text-gray-900">{producto.nombre}</p>
                    <p className="text-gray-600">
                      ${producto.precio.toFixed(2)} · {getCategoriaName(producto.categoria_id)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(producto.id)}
                  >
                    <Trash2 className="size-4 text-red-600" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
