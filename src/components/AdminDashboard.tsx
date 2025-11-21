import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { UsersManagement } from './admin/UsersManagement';
import { CategoriesManagement } from './admin/CategoriesManagement';
import { ProductsManagement } from './admin/ProductsManagement';
import { OrdersView } from './admin/OrdersView';

interface AdminDashboardProps {
  user: any;
}

export function AdminDashboard({ user }: AdminDashboardProps) {
  return (
    <div>
      <h2 className="text-gray-900 mb-6">Panel de Administración</h2>
      
      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="orders">Pedidos</TabsTrigger>
          <TabsTrigger value="products">Productos</TabsTrigger>
          <TabsTrigger value="categories">Categorías</TabsTrigger>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
        </TabsList>
        
        <TabsContent value="orders">
          <OrdersView />
        </TabsContent>
        
        <TabsContent value="products">
          <ProductsManagement />
        </TabsContent>
        
        <TabsContent value="categories">
          <CategoriesManagement />
        </TabsContent>
        
        <TabsContent value="users">
          <UsersManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
