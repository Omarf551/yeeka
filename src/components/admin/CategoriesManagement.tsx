import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export function CategoriesManagement() {
  const [categorias, setCategorias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadCategorias();
  }, []);

  const loadCategorias = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-402bd9dc/categorias`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      const data = await response.json();
      setCategorias(data.categorias || []);
    } catch (error) {
      console.error('Error loading categorias:', error);
      toast.error('Error al cargar categorías');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-402bd9dc/categorias`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ nombre }),
        }
      );

      if (!response.ok) {
        throw new Error('Error al crear categoría');
      }

      toast.success('Categoría creada exitosamente');
      setNombre('');
      loadCategorias();
    } catch (error: any) {
      console.error('Error creating categoria:', error);
      toast.error('Error al crear categoría');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta categoría?')) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-402bd9dc/categorias/${id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Error al eliminar categoría');
      }

      toast.success('Categoría eliminada');
      loadCategorias();
    } catch (error: any) {
      console.error('Error deleting categoria:', error);
      toast.error('Error al eliminar categoría');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Cargando categorías...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Crear Nueva Categoría</CardTitle>
          <CardDescription>Agrega una categoría para organizar productos</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex gap-3">
            <div className="flex-1 space-y-2">
              <Label htmlFor="nombre">Nombre de la Categoría</Label>
              <Input
                id="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Bebidas, Platos Principales, Postres"
                required
              />
            </div>
            <Button type="submit" disabled={creating} className="mt-8">
              <Plus className="size-4 mr-2" />
              {creating ? 'Creando...' : 'Crear'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Categorías Existentes</CardTitle>
          <CardDescription>Lista de todas las categorías</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {categorias.length === 0 ? (
              <p className="text-gray-500 text-center py-4 col-span-full">
                No hay categorías creadas
              </p>
            ) : (
              categorias.map((categoria) => (
                <div
                  key={categoria.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <span className="text-gray-900">{categoria.nombre}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(categoria.id)}
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
